import {describe, expect, it} from "vitest";
import {mergeDuplicateStations} from "./mergeDuplicateStations.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const station = (id: string, name: string): Station => ({id, name, stopLat: 0, stopLon: 0, zoneId: '1'});

const lineOf = (id: string, shortName: string): Line => ({
    id, shortName, longName: shortName, color: 'FFF', textColor: '000', type: 1,
    frequencies: {
        weekday: {peak: 10, offpeak: 10, night: 10},
        weekend: {peak: 10, offpeak: 10, night: 10},
    },
});

const L1 = lineOf('L1', '1');
const L2 = lineOf('L2', '2');
const L3 = lineOf('L3', '3');

describe('mergeDuplicateStations', () => {
    it('merges stations sharing the same name into one, unioning their lines', () => {
        const stations = [station('1', 'Étampes'), station('2', 'Étampes'), station('3', 'Bastille')];
        const linesByStation = new Map([
            ['1', [L1]],
            ['2', [L2]],
            ['3', [L3]],
        ]);

        const result = mergeDuplicateStations(stations, linesByStation);

        expect(result).toHaveLength(2);
        const etampes = result.find(r => r.name === 'Étampes')!;
        expect(etampes.lines.map(l => l.id)).toEqual(['L1', 'L2']);
    });

    it('picks the best-connected station id as canonical (most lines)', () => {
        const stations = [station('1', 'Étampes'), station('2', 'Étampes')];
        const linesByStation = new Map([
            ['1', [L1]],
            ['2', [L1, L2]],
        ]);

        const result = mergeDuplicateStations(stations, linesByStation);

        expect(result[0].id).toBe('2');
    });

    it('preserves the original relative order of first appearance', () => {
        const stations = [station('1', 'B'), station('2', 'A')];

        const result = mergeDuplicateStations(stations, new Map());

        expect(result.map(r => r.name)).toEqual(['B', 'A']);
    });

    it('handles a station with no lines entry', () => {
        const stations = [station('1', 'Étampes')];

        const result = mergeDuplicateStations(stations, new Map());

        expect(result).toEqual([{id: '1', name: 'Étampes', lines: []}]);
    });
});
