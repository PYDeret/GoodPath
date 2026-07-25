import {describe, expect, it} from "vitest";
import {findNearestStation} from "./nearestStation.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";

const station = (id: string, stopLat: number, stopLon: number): Station => ({id, name: id, stopLat, stopLon, zoneId: '1'});

describe('findNearestStation', () => {
    it('returns null for an empty list', () => {
        expect(findNearestStation([], 48.85, 2.35)).toBeNull();
    });

    it('returns the closest station by straight-line distance', () => {
        const far = station('far', 48.90, 2.40);
        const near = station('near', 48.851, 2.351);
        const stations = [far, near];

        expect(findNearestStation(stations, 48.85, 2.35)).toBe(near);
    });
});
