import {describe, expect, it} from "vitest";
import {buildPath, computeShortestPathWithWaypoints, computeShortestPaths} from "./shortestPath.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1'}, {to: 'D', duration: 20, routeId: 'L2'}],
    C: [{to: 'D', duration: 5, routeId: 'L1'}],
};

const waypointGraph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1'}, {to: 'F', duration: 1, routeId: 'L1'}],
    C: [{to: 'D', duration: 5, routeId: 'L1'}],
    D: [{to: 'E', duration: 3, routeId: 'L1'}],
    F: [{to: 'E', duration: 1, routeId: 'L1'}],
};

describe('computeShortestPaths', () => {
    it('finds the shortest cumulative duration to a reachable stop', () => {
        const {durations} = computeShortestPaths(graph, 'A');

        expect(durations.get('D')).toBe(20);
    });

    it('does not include unreachable stops', () => {
        const {durations} = computeShortestPaths(graph, 'D');

        expect(durations.has('A')).toBe(false);
    });
});

describe('computeShortestPaths constraints', () => {
    it('excludes a forbidden station from the traversal entirely', () => {
        const {durations} = computeShortestPaths(graph, 'A', {forbiddenStations: new Set(['C'])});

        expect(durations.has('C')).toBe(false);
        expect(durations.get('D')).toBe(30);
    });

    it('excludes edges on a forbidden line', () => {
        const {durations} = computeShortestPaths(graph, 'A', {forbiddenLines: new Set(['L2'])});

        expect(durations.get('D')).toBe(20);
    });

    it('excludes a specific forbidden edge, forcing a detour', () => {
        const {durations} = computeShortestPaths(graph, 'A', {forbiddenEdges: new Set(['B>D'])});

        expect(durations.get('D')).toBe(20);
    });

    it('leaves a stop unreachable when every path to it is forbidden', () => {
        const {durations} = computeShortestPaths(graph, 'A', {forbiddenStations: new Set(['B'])});

        expect(durations.has('D')).toBe(false);
    });
});

describe('computeShortestPathWithWaypoints', () => {
    it('matches the plain shortest path when there is no required station', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E');

        expect(result).toEqual({path: ['A', 'B', 'F', 'E'], duration: 12});
    });

    it('forces the path through the required station, even if longer', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', ['D']);

        expect(result).toEqual({path: ['A', 'B', 'C', 'D', 'E'], duration: 23});
    });

    it('returns null when a leg has no path under the given constraints', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', [], {forbiddenStations: new Set(['B'])});

        expect(result).toBeNull();
    });
});

describe('buildPath', () => {
    it('reconstructs the ordered path from the predecessors map', () => {
        const {previous} = computeShortestPaths(graph, 'A');

        expect(buildPath(previous, 'D')).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns a single-stop path when there is no predecessor', () => {
        expect(buildPath(new Map(), 'A')).toEqual(['A']);
    });
});
