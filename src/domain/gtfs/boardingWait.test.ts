import {describe, expect, it} from "vitest";
import {computeBoardingWaitSeconds} from "./boardingWait.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const line: Line = {
    id: 'L1', shortName: '1', longName: 'Line 1', color: 'FFF', textColor: '000', type: 1,
    frequencies: {
        weekday: {peak: 4, offpeak: 10, night: 20},
        weekend: {peak: 8, offpeak: 12, night: 30},
    },
};

describe('computeBoardingWaitSeconds', () => {
    it('charges half the frequency for the current bucket, in seconds', () => {
        expect(computeBoardingWaitSeconds(line, 'weekday', 8 * 3600)).toBe(4 * 60 / 2);
    });

    it('picks the bucket from the given clock time', () => {
        expect(computeBoardingWaitSeconds(line, 'weekday', 12 * 3600)).toBe(10 * 60 / 2);
    });

    it('picks the frequency for the given day type', () => {
        expect(computeBoardingWaitSeconds(line, 'weekend', 8 * 3600)).toBe(8 * 60 / 2);
    });

    it('falls back to a 20-minute frequency when no line is given', () => {
        expect(computeBoardingWaitSeconds(undefined, 'weekday', 8 * 3600)).toBe(20 * 60 / 2);
    });
});
