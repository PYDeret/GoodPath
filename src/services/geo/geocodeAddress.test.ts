import {afterEach, describe, expect, it, vi} from "vitest";
import {geocodeAddress} from "./geocodeAddress.ts";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('geocodeAddress', () => {
    it('returns coordinates and label from the first matching feature', async () => {
        const json = () => Promise.resolve({
            features: [{geometry: {coordinates: [2.35, 48.85]}, properties: {label: '1 Rue de Test, Paris'}}],
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json}));

        const result = await geocodeAddress('1 Rue de Test');

        expect(result).toEqual({lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'});
    });

    it('returns null when no feature matches', async () => {
        const json = () => Promise.resolve({features: []});
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json}));

        const result = await geocodeAddress('nowhere');

        expect(result).toBeNull();
    });
});
