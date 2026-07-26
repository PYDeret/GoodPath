import {describe, expect, it} from "vitest";
import {computePatternId} from "./tripPattern.mjs";

describe('computePatternId', () => {
    it('returns the same id for the same stop sequence', () => {
        expect(computePatternId(['A', 'B', 'C'])).toBe(computePatternId(['A', 'B', 'C']));
    });

    it('returns a different id when a stop is skipped', () => {
        expect(computePatternId(['A', 'B', 'C'])).not.toBe(computePatternId(['A', 'C']));
    });

    it('returns a different id when the stop order differs', () => {
        expect(computePatternId(['A', 'B', 'C'])).not.toBe(computePatternId(['A', 'C', 'B']));
    });

    it('returns a non-empty string', () => {
        expect(computePatternId(['A', 'B'])).toEqual(expect.any(String));
        expect(computePatternId(['A', 'B']).length).toBeGreaterThan(0);
    });
});
