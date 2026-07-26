import {describe, expect, it} from "vitest";
import {buildPathLegs} from "./pathLegs.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 10, routeId: 'L1'}],
    C: [{to: 'D', duration: 10, routeId: 'L2'}],
};

describe('buildPathLegs', () => {
    it('merges consecutive stops travelled on the same route into one leg, summing arrival gaps into duration', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C'], [0, 15, 30])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], duration: 30},
        ]);
    });

    it('splits into a new leg when the route changes, each with its own duration', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C', 'D'], [0, 15, 30, 42])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], duration: 30},
            {routeId: 'L2', fromStopId: 'C', toStopId: 'D', stopIds: ['C', 'D'], duration: 12},
        ]);
    });

    it('returns an empty array for a single-stop path', () => {
        expect(buildPathLegs(graph, ['A'], [0])).toEqual([]);
    });
});
