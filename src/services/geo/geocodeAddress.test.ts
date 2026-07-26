import {afterEach, describe, expect, it, vi} from "vitest";
import {geocodeAddress, searchAddresses} from "./geocodeAddress.ts";

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

describe('searchAddresses', () => {
    it('returns coordinates and label for each matching feature', async () => {
        const json = () => Promise.resolve({
            features: [
                {geometry: {coordinates: [2.35, 48.85]}, properties: {label: '1 Rue de Test, Paris'}},
                {geometry: {coordinates: [2.36, 48.86]}, properties: {label: '2 Rue de Test, Paris'}},
            ],
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json}));

        const result = await searchAddresses('Rue de Test');

        expect(result).toEqual([
            {lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'},
            {lat: 48.86, lon: 2.36, label: '2 Rue de Test, Paris'},
        ]);
    });

    it('returns an empty array when no feature matches', async () => {
        const json = () => Promise.resolve({features: []});
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json}));

        const result = await searchAddresses('nowhere');

        expect(result).toEqual([]);
    });
});
