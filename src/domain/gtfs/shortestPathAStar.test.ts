import {describe, expect, it} from "vitest";
import {buildPath, computeShortestPaths} from "./shortestPath.ts";
import {computeShortestPathAStar} from "./shortestPathAStar.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1'}, {to: 'D', duration: 20, routeId: 'L2'}],
    C: [{to: 'D', duration: 5, routeId: 'L1'}],
};

// Coordinates only a few meters apart: with edge durations of a few seconds,
// this keeps the heuristic (distance / max speed) admissible for the test.
const stationsById: Record<string, Station> = {
    A: {id: 'A', name: 'A', stopLat: 48.8500, stopLon: 2.3500, zoneId: '1'},
    B: {id: 'B', name: 'B', stopLat: 48.8501, stopLon: 2.3501, zoneId: '1'},
    C: {id: 'C', name: 'C', stopLat: 48.8502, stopLon: 2.3502, zoneId: '1'},
    D: {id: 'D', name: 'D', stopLat: 48.8503, stopLon: 2.3503, zoneId: '1'},
};

describe('computeShortestPathAStar', () => {
    it('finds the same duration as Dijkstra', () => {
        const {durations} = computeShortestPaths(graph, 'A');
        const aStarResult = computeShortestPathAStar(graph, stationsById, 'A', 'D');

        expect(aStarResult?.duration).toBe(durations.get('D'));
    });

    it('finds the same path as Dijkstra', () => {
        const {previous} = computeShortestPaths(graph, 'A');
        const aStarResult = computeShortestPathAStar(graph, stationsById, 'A', 'D');

        expect(aStarResult?.path).toEqual(buildPath(previous, 'D'));
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
