import {describe, expect, it, vi} from "vitest";
import {fetchLineIcons} from "./fetchLineIcons.mjs";

const spriteResponse = (svg) => ({ok: true, status: 200, text: () => Promise.resolve(svg)});
const errorResponse = (status) => ({ok: false, status, text: () => Promise.resolve('')});

const SAMPLE_SPRITE = `<svg xmlns="http://www.w3.org/2000/svg">
<symbol id="C01742" viewBox="0 0 60 60"><rect fill="#FFCE00"/></symbol>
<symbol id="C01743" viewBox="0 0 60 60"><rect fill="#00814F"/></symbol>
</svg>`;

describe('fetchLineIcons', () => {
    it('calls the sprite endpoint once with getAll=true and the apikey header', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(spriteResponse(SAMPLE_SPRITE));

        await fetchLineIcons(['IDFM:C01742'], 'token123', fetchImpl);

        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(fetchImpl).toHaveBeenCalledWith(
            'https://prim.iledefrance-mobilites.fr/marketplace/ilico/getIcon/sprite?getAll=true&format=sprite&style=colored',
            expect.objectContaining({headers: {apikey: 'token123'}})
        );
    });

    it('strips the IDFM: prefix and returns the matching symbol wrapped as a standalone SVG', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(spriteResponse(SAMPLE_SPRITE));

        const icons = await fetchLineIcons(['IDFM:C01742'], 'token123', fetchImpl);

        expect(icons.get('C01742')).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect fill="#FFCE00"/></svg>'
        );
    });

    it('returns only the requested line ids, ignoring other symbols in the sprite', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(spriteResponse(SAMPLE_SPRITE));

        const icons = await fetchLineIcons(['IDFM:C01742'], 'token123', fetchImpl);

        expect(icons.size).toBe(1);
        expect(icons.has('C01743')).toBe(false);
    });

    it('omits a requested line id absent from the sprite instead of throwing', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(spriteResponse(SAMPLE_SPRITE));

        const icons = await fetchLineIcons(['IDFM:C99999'], 'token123', fetchImpl);

        expect(icons.size).toBe(0);
    });

    it('dedupes repeated line ids without affecting the result', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(spriteResponse(SAMPLE_SPRITE));

        const icons = await fetchLineIcons(['IDFM:C01742', 'IDFM:C01742'], 'token123', fetchImpl);

        expect(icons.size).toBe(1);
    });

    it('throws if the sprite request itself fails', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(errorResponse(429));

        await expect(fetchLineIcons(['IDFM:C01742'], 'token123', fetchImpl)).rejects.toThrow('HTTP 429');
    });
});
