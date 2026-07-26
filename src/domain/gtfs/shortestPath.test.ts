import {describe, expect, it} from "vitest";
import {buildPath, computeShortestPathWithWaypoints, computeShortestPaths, stateKey} from "./shortestPath.ts";
import type {Schedule} from "./shortestPath.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const lineWithFrequency = (id: string, peakMinutes: number, offpeakMinutes: number): Line => ({
    id, shortName: id, longName: id, color: 'FFF', textColor: '000', type: 1,
    frequencies: {
        weekday: {peak: peakMinutes, offpeak: offpeakMinutes, night: offpeakMinutes},
        weekend: {peak: peakMinutes, offpeak: offpeakMinutes, night: offpeakMinutes},
    },
});

const L1 = lineWithFrequency('L1', 10, 10);
const L2 = lineWithFrequency('L2', 10, 10);

const scheduleWith = (...lines: Line[]): Schedule => ({
    linesById: new Map(lines.map(line => [line.id, line])),
    dayType: 'weekday',
});

const PEAK_START = 8 * 3600;

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1', patternId: 'L1'}, {to: 'D', duration: 20, routeId: 'L2', patternId: 'L2'}],
    C: [{to: 'D', duration: 5, routeId: 'L1', patternId: 'L1'}],
};

const waypointGraph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1', patternId: 'L1'}, {to: 'F', duration: 1, routeId: 'L1', patternId: 'L1'}],
    C: [{to: 'D', duration: 5, routeId: 'L1', patternId: 'L1'}],
    D: [{to: 'E', duration: 3, routeId: 'L1', patternId: 'L1'}],
    F: [{to: 'E', duration: 1, routeId: 'L1', patternId: 'L1'}],
};

describe('computeShortestPaths', () => {
    it('finds the shortest cumulative duration to a reachable stop, including boarding waits', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        // A->B->C->D on L1 the whole way: one boarding wait (5min = 300s) + 20s ride.
        // A->B->D via L2 at B: two boarding waits (L1 then L2) + 30s ride = 600+30=630 vs 300+20=320.
        expect(durations.get(stateKey('D', 'L1'))).toBe(300 + 20);
    });

    it('does not include unreachable stops', () => {
        const {durations} = computeShortestPaths(graph, 'D', PEAK_START, scheduleWith(L1, L2));

        expect(durations.has(stateKey('A', null))).toBe(false);
    });

    it('charges no boarding wait when continuing on the same pattern', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        const boardingOnly = durations.get(stateKey('B', 'L1'))!;
        const continuing = durations.get(stateKey('C', 'L1'))!;

        // B->C costs exactly its 5s duration on top of the boarding-only state.
        expect(continuing - boardingOnly).toBe(5);
    });

    it('charges a fresh boarding wait when changing lines', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        // A -> B (board L1, wait 300s + 10s ride) -> D (board L2, wait 300s + 20s ride)
        expect(durations.get(stateKey('D', 'L2'))).toBe(300 + 10 + 300 + 20);
    });

    it('forbids reaching a stop via a different pattern of the same route id without a transfer', () => {
        // Same line L1, but B->C is a different physical pattern than A->B, with no
        // TRANSFER edge in between — this is the "phantom reboarding" this fix forbids.
        const noTransferGraph: TransportGraph = {
            A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'P1'}],
            B: [
                {to: 'C', duration: 5, routeId: 'L1', patternId: 'P1'},
                {to: 'D', duration: 1, routeId: 'L1', patternId: 'P2'},
            ],
        };

        const {durations} = computeShortestPaths(noTransferGraph, 'A', PEAK_START, scheduleWith(L1));

        // D is only reachable via the P2 edge, which requires switching patterns
        // mid-ride on the same route id L1 without a transfer -> forbidden entirely.
        expect(durations.has(stateKey('D', 'P2'))).toBe(false);
        // Continuing on the same pattern P1 must still work.
        expect(durations.has(stateKey('C', 'P1'))).toBe(true);
    });

    it('still allows boarding a different pattern of the same route id immediately after a transfer edge', () => {
        const graphWithTransfer: TransportGraph = {
            A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'P1'}],
            B: [{to: 'C', duration: 60, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
            C: [{to: 'D', duration: 5, routeId: 'L1', patternId: 'P2'}],
        };

        const {durations} = computeShortestPaths(graphWithTransfer, 'A', PEAK_START, scheduleWith(L1));

        expect(durations.has(stateKey('D', 'P2'))).toBe(true);
    });

    it('still allows switching to a genuinely different line at a shared stop without a transfer edge', () => {
        // graph: A->B on L1 (pattern L1), B->D on L2 (pattern L2) with no TRANSFER
        // edge — a real line change at a stop shared by two different lines, which
        // must remain allowed (only same-route pattern switches are forbidden).
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        expect(durations.has(stateKey('D', 'L2'))).toBe(true);
    });

    it('uses the simulated clock (start + elapsed) to pick the bucket at boarding time', () => {
        const nightLine = lineWithFrequency('L1', 10, 40); // peak=10min, offpeak=40min
        const schedule = scheduleWith(nightLine);
        const lateGraph: TransportGraph = {A: [{to: 'B', duration: 0, routeId: 'L1', patternId: 'L1'}]};

        // Boarding at PEAK_START itself: bucket is peak -> wait = 10*60/2 = 300
        const {durations: peakBoarding} = computeShortestPaths(lateGraph, 'A', PEAK_START, schedule);
        expect(peakBoarding.get(stateKey('B', 'L1'))).toBe(300);

        // Boarding at 10:00 (offpeak): wait = 40*60/2 = 1200
        const {durations: offpeakBoarding} = computeShortestPaths(lateGraph, 'A', 10 * 3600, schedule);
        expect(offpeakBoarding.get(stateKey('B', 'L1'))).toBe(1200);
    });

    it('advances the simulated clock across a bucket boundary for a later (non-first) boarding', () => {
        // L1's wait is identical peak or offpeak, so the first boarding can't
        // hint at which bucket was used. L2's wait differs sharply between
        // buckets, so only the second boarding's result can prove the clock
        // advanced with elapsed ride time rather than staying pinned to the
        // departure bucket.
        const firstLine = lineWithFrequency('L1', 10, 10); // peak=10min, offpeak=10min (bucket-insensitive)
        const secondLine = lineWithFrequency('L2', 10, 40); // peak=10min, offpeak=40min (bucket-sensitive)
        const schedule = scheduleWith(firstLine, secondLine);

        const laterGraph: TransportGraph = {
            // 61-minute ride: departs 8:00 (peak), arrives 9:01 (past the 9:00 peak cutoff -> offpeak).
            A: [{to: 'B', duration: 61 * 60, routeId: 'L1', patternId: 'L1'}],
            // Zero-duration transfer resets the "currently boarded" pattern without adding elapsed time.
            B: [{to: 'C', duration: 0, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
            C: [{to: 'D', duration: 0, routeId: 'L2', patternId: 'L2'}],
        };

        const {durations} = computeShortestPaths(laterGraph, 'A', PEAK_START, schedule);

        // Board L1 at 8:00 (peak, wait 300) + 3660s ride + 0s walk
        // + board L2 at 8:00 + 3660s = 9:01, i.e. offpeak -> wait = 40*60/2 = 1200 (not the peak 300).
        // A fixed-clock bug would reuse the 8:00 departure bucket for L2 too, giving 300 instead.
        expect(durations.get(stateKey('D', 'L2'))).toBe(300 + 61 * 60 + 1200);
    });

    it('resets the boarding state after a transfer edge, forcing a wait on the next ride', () => {
        const transferGraph: TransportGraph = {
            A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'L1'}],
            B: [{to: 'C', duration: 60, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
            C: [{to: 'D', duration: 5, routeId: 'L1', patternId: 'L1'}],
        };

        const {durations} = computeShortestPaths(transferGraph, 'A', PEAK_START, scheduleWith(L1));

        // board L1 (wait 300) + 10s ride + 60s walk + board L1 again (wait 300) + 5s ride
        expect(durations.get(stateKey('D', 'L1'))).toBe(300 + 10 + 60 + 300 + 5);
    });
});

describe('computeShortestPaths constraints', () => {
    it('excludes a forbidden station from the traversal entirely', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2), {forbiddenStations: new Set(['C'])});

        expect([...durations.keys()].some(state => state.startsWith('C|'))).toBe(false);
    });

    it('excludes edges on a forbidden line', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2), {forbiddenLines: new Set(['L2'])});

        expect(durations.has(stateKey('D', 'L2'))).toBe(false);
    });

    it('excludes a specific forbidden edge, forcing a detour', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2), {forbiddenEdges: new Set(['B>D'])});

        expect(durations.has(stateKey('D', 'L2'))).toBe(false);
        expect(durations.has(stateKey('D', 'L1'))).toBe(true);
    });
});

describe('computeShortestPathWithWaypoints', () => {
    const waypointSchedule = scheduleWith(L1);

    it('matches the plain shortest path when there is no required station', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', PEAK_START, waypointSchedule);

        // single boarding wait (300s) + ride time (10+1+1=12s)
        expect(result).toEqual({
            path: ['A', 'B', 'F', 'E'],
            duration: 312,
            arrivals: [0, 300 + 10, 300 + 11, 300 + 12],
            patternIds: [null, 'L1', 'L1', 'L1'],
        });
    });

    it('forces the path through the required station, even if longer, and pays a fresh boarding wait per leg', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', PEAK_START, waypointSchedule, ['D']);

        // leg 1 (A->D via B,C): wait 300 + ride 10+5+5=20 = 320
        // leg 2 (D->E): wait 300 + ride 3 = 303
        expect(result?.duration).toBe(320 + 303);
        expect(result?.path).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(result?.arrivals).toEqual([0, 300 + 10, 300 + 15, 320, 320 + 303]);
        expect(result?.patternIds).toEqual([null, 'L1', 'L1', 'L1', 'L1']);
    });

    it('returns null when a leg has no path under the given constraints', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', PEAK_START, waypointSchedule, [], {forbiddenStations: new Set(['B'])});

        expect(result).toBeNull();
    });

    it('records the transfer sentinel as the pattern id for a stop reached via a transfer edge', () => {
        const transferGraph: TransportGraph = {
            A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'L1'}],
            B: [{to: 'C', duration: 60, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
            C: [{to: 'D', duration: 5, routeId: 'L1', patternId: 'L1'}],
        };

        const result = computeShortestPathWithWaypoints(transferGraph, 'A', 'D', PEAK_START, scheduleWith(L1));

        expect(result?.path).toEqual(['A', 'B', 'C', 'D']);
        expect(result?.patternIds).toEqual([null, 'L1', 'TRANSFER', 'L1']);
    });
});

describe('buildPath', () => {
    it('reconstructs the ordered path from the predecessors map', () => {
        const {previous} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        expect(buildPath(previous, stateKey('D', 'L1'))).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns a single-stop path when there is no predecessor', () => {
        expect(buildPath(new Map(), stateKey('A', null))).toEqual(['A']);
    });
});
