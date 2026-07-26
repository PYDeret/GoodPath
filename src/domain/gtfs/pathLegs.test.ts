import {describe, expect, it} from "vitest";
import {buildPathLegs} from "./pathLegs.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'L1'}],
    B: [{to: 'C', duration: 10, routeId: 'L1', patternId: 'L1'}],
    C: [{to: 'D', duration: 10, routeId: 'L2', patternId: 'L2'}],
};

describe('buildPathLegs', () => {
    it('merges consecutive stops travelled on the same route into one leg, summing arrival gaps into duration', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C'], [0, 15, 30], [null, 'L1', 'L1'])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], duration: 30, isTransfer: false},
        ]);
    });

    it('splits into a new leg when the route changes, each with its own duration', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C', 'D'], [0, 15, 30, 42], [null, 'L1', 'L1', 'L2'])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], duration: 30, isTransfer: false},
            {routeId: 'L2', fromStopId: 'C', toStopId: 'D', stopIds: ['C', 'D'], duration: 12, isTransfer: false},
        ]);
    });

    it('returns an empty array for a single-stop path', () => {
        expect(buildPathLegs(graph, ['A'], [0], [null])).toEqual([]);
    });

    it('flags a leg riding the transfer sentinel routeId as isTransfer', () => {
        const transferGraph: TransportGraph = {
            A: [{to: 'B', duration: 5, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
        };

        expect(buildPathLegs(transferGraph, ['A', 'B'], [0, 5], [null, 'TRANSFER'])).toEqual([
            {routeId: 'TRANSFER', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 5, isTransfer: true},
        ]);
    });

    it('picks the edge matching the given pattern when several edges connect the same stop pair', () => {
        const multiPatternGraph: TransportGraph = {
            A: [
                {to: 'B', duration: 10, routeId: 'L1', patternId: 'P1'},
                {to: 'B', duration: 4, routeId: 'L1', patternId: 'P2'},
            ],
        };

        // arrivals gap of 4 must come from the P2 edge, not the P1 edge (duration 10),
        // proving the lookup used patternIds rather than just matching on `to`.
        expect(buildPathLegs(multiPatternGraph, ['A', 'B'], [0, 4], [null, 'P2'])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 4, isTransfer: false},
        ]);
    });
});
