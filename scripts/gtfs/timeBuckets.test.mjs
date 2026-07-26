import {describe, expect, it} from "vitest";
import * as mjsBuckets from "./timeBuckets.mjs";
import * as tsBuckets from "../../src/domain/gtfs/timeBuckets.ts";

describe('timeBuckets mjs/ts sync', () => {
    it('keeps the same boundary constants in both implementations', () => {
        expect(mjsBuckets.PEAK_RANGES).toEqual(tsBuckets.PEAK_RANGES);
        expect(mjsBuckets.NIGHT_START).toBe(tsBuckets.NIGHT_START);
        expect(mjsBuckets.NIGHT_END).toBe(tsBuckets.NIGHT_END);
    });

    it.each([
        0, 6 * 3600 - 1, 6 * 3600, 7 * 3600, 8 * 3600, 9 * 3600 - 1, 9 * 3600,
        17 * 3600, 19 * 3600 - 1, 19 * 3600, 21 * 3600 - 1, 21 * 3600, 23 * 3600,
    ])('agrees on the bucket for %i seconds', (seconds) => {
        expect(mjsBuckets.timeBucketFor(seconds)).toBe(tsBuckets.timeBucketFor(seconds));
    });
});
