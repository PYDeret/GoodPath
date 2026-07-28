import {describe, expect, it, vi} from "vitest";
import {fetchLineIcons} from "./fetchLineIcons.mjs";

const okResponse = (svg) => ({ok: true, status: 200, text: () => Promise.resolve(svg)});
const notFoundResponse = () => ({ok: false, status: 404, text: () => Promise.resolve('')});

describe('fetchLineIcons', () => {
    it('strips the IDFM: prefix and calls the getIcon endpoint with style=colored', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse('<svg>A</svg>'));

        await fetchLineIcons(['IDFM:C01742'], 'token123', fetchImpl);

        expect(fetchImpl).toHaveBeenCalledWith(
            'https://prim.iledefrance-mobilites.fr/marketplace/ilico/getIcon/C01742?style=colored',
            expect.objectContaining({headers: {Authorization: 'token123'}})
        );
    });

    it('returns a Map keyed by bare line id with the SVG text', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse('<svg>A</svg>'));

        const icons = await fetchLineIcons(['IDFM:C01742'], 'token123', fetchImpl);

        expect(icons.get('C01742')).toBe('<svg>A</svg>');
    });

    it('omits a line that returns 404 instead of throwing', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(notFoundResponse());

        const icons = await fetchLineIcons(['IDFM:C00000'], 'token123', fetchImpl);

        expect(icons.size).toBe(0);
    });

    it('omits a line whose fetch rejects, without failing the others', async () => {
        const fetchImpl = vi.fn()
            .mockRejectedValueOnce(new Error('network down'))
            .mockResolvedValueOnce(okResponse('<svg>B</svg>'));

        const icons = await fetchLineIcons(['IDFM:C00001', 'IDFM:C00002'], 'token123', fetchImpl);

        expect(icons.size).toBe(1);
        expect(icons.get('C00002')).toBe('<svg>B</svg>');
    });

    it('dedupes repeated line ids', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse('<svg>A</svg>'));

        await fetchLineIcons(['IDFM:C01742', 'IDFM:C01742'], 'token123', fetchImpl);

        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('never runs more than 10 fetches concurrently', async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        const lineIds = Array.from({length: 25}, (_, i) => `IDFM:C${String(i).padStart(5, '0')}`);
        const fetchImpl = vi.fn().mockImplementation(async () => {
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 0));
            inFlight--;
            return okResponse('<svg/>');
        });

        await fetchLineIcons(lineIds, 'token123', fetchImpl);

        expect(maxInFlight).toBeLessThanOrEqual(10);
        expect(fetchImpl).toHaveBeenCalledTimes(25);
    });
});
