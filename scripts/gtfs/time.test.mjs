import {describe, expect, it} from "vitest";
import {parseGtfsTime} from "./time.mjs";

describe('parseGtfsTime', () => {
    it('parses HH:MM:SS into seconds since midnight', () => {
        expect(parseGtfsTime('08:05:30')).toBe(8 * 3600 + 5 * 60 + 30);
    });

    it('handles GTFS hours past 23 (past-midnight service)', () => {
        expect(parseGtfsTime('25:00:00')).toBe(25 * 3600);
    });
});
