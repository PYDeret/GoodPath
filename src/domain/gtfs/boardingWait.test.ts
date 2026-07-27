import {describe, expect, it} from "vitest";
import {computeBoardingWaitSeconds} from "./boardingWait.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const lineWithDepartures = (weekday: number[], weekend: number[] = weekday): Line => ({
    id: 'L1', shortName: '1', longName: 'Line 1', color: 'FFF', textColor: '000', type: 1,
    departureTimes: {weekday, weekend},
});

describe('computeBoardingWaitSeconds', () => {
    it('waits until the next real departure later the same day', () => {
        const line = lineWithDepartures([8 * 3600, 9 * 3600, 10 * 3600]);

        expect(computeBoardingWaitSeconds(line, 'weekday', 8 * 3600 + 1800)).toBe(1800);
    });

    it('returns zero wait when boarding exactly at a scheduled departure', () => {
        const line = lineWithDepartures([9 * 3600]);

        expect(computeBoardingWaitSeconds(line, 'weekday', 9 * 3600)).toBe(0);
    });

    it('picks the departures list for the given day type', () => {
        const line = lineWithDepartures([8 * 3600], [20 * 3600]);

        expect(computeBoardingWaitSeconds(line, 'weekend', 19 * 3600)).toBe(3600);
    });

    it('wraps to the earliest departure the next day when every departure today has passed', () => {
        const line = lineWithDepartures([8 * 3600, 20 * 3600]);

        // Last departure was 20:00; querying at 23:00 must wait until 8:00 tomorrow: 9h.
        expect(computeBoardingWaitSeconds(line, 'weekday', 23 * 3600)).toBe(9 * 3600);
    });

    it('returns Infinity when the line has no departures at all for that day type', () => {
        const line = lineWithDepartures([8 * 3600], []);

        expect(computeBoardingWaitSeconds(line, 'weekend', 8 * 3600)).toBe(Infinity);
    });

    it('falls back to a flat wait when no line is given', () => {
        expect(computeBoardingWaitSeconds(undefined, 'weekday', 8 * 3600)).toBe(600);
    });

    it('falls back to a flat wait when the line has no departureTimes data', () => {
        const lineWithoutDepartureTimes = {...lineWithDepartures([8 * 3600]), departureTimes: undefined} as unknown as Line;

        expect(computeBoardingWaitSeconds(lineWithoutDepartureTimes, 'weekday', 8 * 3600)).toBe(600);
    });

    it('normalizes a clock time beyond 24h to the correct time-of-day phase', () => {
        const line = lineWithDepartures([8 * 3600]);

        // 32h = 8h into the next day, exactly matching the 8:00 departure -> 0 wait.
        expect(computeBoardingWaitSeconds(line, 'weekday', 32 * 3600)).toBe(0);
    });
});
