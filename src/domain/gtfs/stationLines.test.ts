import {describe, expect, it} from "vitest";
import {linesByStation} from "./stationLines.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const lineOf = (id: string, shortName: string): Line => ({
    id, shortName, longName: shortName, color: 'FFF', textColor: '000', type: 1,
    departureTimes: {weekday: [], weekend: []},
});

const L1 = lineOf('L1', '1');
const L2 = lineOf('L2', '2');

describe('linesByStation', () => {
    it('associates both endpoints of a ride edge with its line', () => {
        const graph: TransportGraph = {
            A: [{to: 'B', duration: 60, routeId: 'L1', patternId: 'P1'}],
        };

        const result = linesByStation(graph, [L1]);

        expect(result.get('A')).toEqual([L1]);
        expect(result.get('B')).toEqual([L1]);
    });

    it('collects multiple distinct lines serving the same station, sorted by short name', () => {
        const graph: TransportGraph = {
            A: [
                {to: 'B', duration: 60, routeId: 'L2', patternId: 'P2'},
                {to: 'C', duration: 60, routeId: 'L1', patternId: 'P1'},
            ],
        };

        const result = linesByStation(graph, [L1, L2]);

        expect(result.get('A')).toEqual([L1, L2]);
    });

    it('ignores transfer edges', () => {
        const graph: TransportGraph = {
            A: [{to: 'B', duration: 60, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
        };

        const result = linesByStation(graph, [L1]);

        expect(result.has('A')).toBe(false);
        expect(result.has('B')).toBe(false);
    });

    it('returns no entry for a station absent from the graph', () => {
        const result = linesByStation({}, [L1]);

        expect(result.has('Z')).toBe(false);
    });
});
