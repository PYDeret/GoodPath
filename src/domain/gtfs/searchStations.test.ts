import {describe, expect, it} from "vitest";
import {searchStations} from "./searchStations.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";

const station = (id: string, name: string): Station => ({id, name, stopLat: 0, stopLon: 0, zoneId: '1'});

const stations = [
    station('1', "Gare de Saint-Martin d'Étampes"),
    station('2', 'Étampes'),
    station('3', 'Saint-Michel-sur-Orge'),
    station('4', 'Bastille'),
];

describe('searchStations', () => {
    it('matches accented station names when the query has no accents', () => {
        const results = searchStations(stations, 'etampes', 10);

        expect(results.map(s => s.id)).toEqual(expect.arrayContaining(['1', '2']));
    });

    it('ranks names starting with the query ahead of names that only contain it', () => {
        const results = searchStations(stations, 'etampes', 10);

        expect(results[0].id).toBe('2'); // "Étampes" starts with the query; "...Saint-Martin d'Étampes" doesn't
    });

    it('caps results at the given limit', () => {
        const results = searchStations(stations, 'a', 2);

        expect(results).toHaveLength(2);
    });

    it('returns an empty array for a blank query', () => {
        expect(searchStations(stations, '   ', 10)).toEqual([]);
    });
});
