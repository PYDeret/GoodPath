import {describe, expect, it} from "vitest";
import {buildPath, computeShortestPaths} from "./shortestPath.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1'}, {to: 'D', duration: 20, routeId: 'L2'}],
    C: [{to: 'D', duration: 5, routeId: 'L1'}],
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

describe('buildPath', () => {
    it('reconstructs the ordered path from the predecessors map', () => {
        const {previous} = computeShortestPaths(graph, 'A');

        expect(buildPath(previous, 'D')).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns a single-stop path when there is no predecessor', () => {
        expect(buildPath(new Map(), 'A')).toEqual(['A']);
    });
});
