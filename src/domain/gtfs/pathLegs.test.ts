import {describe, expect, it} from "vitest";
import {buildPathLegs} from "./pathLegs.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 10, routeId: 'L1'}],
    C: [{to: 'D', duration: 10, routeId: 'L2'}],
};

describe('buildPathLegs', () => {
    it('merges consecutive stops travelled on the same route into one leg', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C'])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], isTransfer: false},
        ]);
    });

    it('splits into a new leg when the route changes', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C', 'D'])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], isTransfer: false},
            {routeId: 'L2', fromStopId: 'C', toStopId: 'D', stopIds: ['C', 'D'], isTransfer: false},
        ]);
    });

    it('returns an empty array for a single-stop path', () => {
        expect(buildPathLegs(graph, ['A'])).toEqual([]);
    });

    it('flags a leg riding the transfer sentinel routeId as isTransfer', () => {
        const transferGraph: TransportGraph = {
            A: [{to: 'B', duration: 5, routeId: 'TRANSFER'}],
        };

        expect(buildPathLegs(transferGraph, ['A', 'B'])).toEqual([
            {routeId: 'TRANSFER', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], isTransfer: true},
        ]);
    });
});
