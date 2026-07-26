import {describe, expect, it} from "vitest";
import {buildPath, computeShortestPaths, stateKey} from "./shortestPath.ts";
import type {Schedule} from "./shortestPath.ts";
import {computeShortestPathAStar} from "./shortestPathAStar.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1'}, {to: 'D', duration: 20, routeId: 'L2'}],
    C: [{to: 'D', duration: 5, routeId: 'L1'}],
};

// computeShortestPathAStar is schedule-agnostic (pure travel time, no boarding
// waits) — see the design spec's "map-click flow is time-agnostic" rule — so
// it needs no Schedule. computeShortestPaths now does time-dependent boarding
// waits, so these cross-check tests need a Schedule and a fixed departure time.
const lineWithFrequency = (id: string, peakMinutes: number, offpeakMinutes: number): Line => ({
    id, shortName: id, longName: id, color: 'FFF', textColor: '000', type: 1,
    frequencies: {
        weekday: {peak: peakMinutes, offpeak: offpeakMinutes, night: offpeakMinutes},
        weekend: {peak: peakMinutes, offpeak: offpeakMinutes, night: offpeakMinutes},
    },
});

const L1 = lineWithFrequency('L1', 10, 10);
const L2 = lineWithFrequency('L2', 10, 10);

const schedule: Schedule = {
    linesById: new Map([L1, L2].map(line => [line.id, line])),
    dayType: 'weekday',
};

const START_TIME = 8 * 3600;
const BOARDING_WAIT = 300; // 10min frequency / 2, for either line at START_TIME

// Coordinates only a few meters apart: with edge durations of a few seconds,
// this keeps the heuristic (distance / max speed) admissible for the test.
const stationsById: Record<string, Station> = {
    A: {id: 'A', name: 'A', stopLat: 48.8500, stopLon: 2.3500, zoneId: '1'},
    B: {id: 'B', name: 'B', stopLat: 48.8501, stopLon: 2.3501, zoneId: '1'},
    C: {id: 'C', name: 'C', stopLat: 48.8502, stopLon: 2.3502, zoneId: '1'},
    D: {id: 'D', name: 'D', stopLat: 48.8503, stopLon: 2.3503, zoneId: '1'},
};

describe('computeShortestPathAStar', () => {
    it('finds the same pure travel time as Dijkstra, once boarding waits are subtracted', () => {
        // A* is schedule-agnostic (no boarding waits); Dijkstra is now
        // time-dependent and charges one boarding wait for this single-line
        // route (A->B->C->D on L1). They should agree once that wait is removed.
        const {durations} = computeShortestPaths(graph, 'A', START_TIME, schedule);
        const aStarResult = computeShortestPathAStar(graph, stationsById, 'A', 'D');

        expect(aStarResult?.duration).toBe(durations.get(stateKey('D', 'L1'))! - BOARDING_WAIT);
    });

    it('finds the same path as Dijkstra', () => {
        const {previous} = computeShortestPaths(graph, 'A', START_TIME, schedule);
        const aStarResult = computeShortestPathAStar(graph, stationsById, 'A', 'D');

        expect(aStarResult?.path).toEqual(buildPath(previous, stateKey('D', 'L1')));
    });

    it('returns null when the destination is unreachable', () => {
        expect(computeShortestPathAStar(graph, stationsById, 'D', 'A')).toBeNull();
    });

    it('respects forbidden stations like Dijkstra does', () => {
        const result = computeShortestPathAStar(graph, stationsById, 'A', 'D', {forbiddenStations: new Set(['C'])});

        expect(result?.duration).toBe(30);
    });

    it('falls back gracefully when a station has no known coordinates', () => {
        const result = computeShortestPathAStar(graph, {}, 'A', 'D');

        expect(result?.duration).toBe(20);
    });
});
