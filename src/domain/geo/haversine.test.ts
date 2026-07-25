import {describe, expect, it} from "vitest";
import {haversineDistance} from "./haversine.ts";

describe('haversineDistance', () => {
    it('returns 0 for identical points', () => {
        expect(haversineDistance(48.85, 2.35, 48.85, 2.35)).toBe(0);
    });

    it('approximates the known distance between Paris and Lyon (~392km)', () => {
        const distance = haversineDistance(48.8566, 2.3522, 45.7640, 4.8357);

        expect(distance).toBeGreaterThan(390_000);
        expect(distance).toBeLessThan(395_000);
    });
});
