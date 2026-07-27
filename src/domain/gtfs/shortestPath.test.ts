import {describe, expect, it} from "vitest";
import {buildPath, computeShortestPathWithWaypoints, computeShortestPaths, stateKey} from "./shortestPath.ts";
import type {Schedule} from "./shortestPath.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const lineWithDepartures = (id: string, weekdayDepartures: number[]): Line => ({
    id, shortName: id, longName: id, color: 'FFF', textColor: '000', type: 1,
    departureTimes: {weekday: weekdayDepartures, weekend: weekdayDepartures},
});

const PEAK_START = 8 * 3600;

// L1 boards at 8:00:00 (28800) in most tests below -> needs a departure at
// 29100 (28800+300) to give exactly a 300s wait. The waypoint tests'
// second leg boards L1 fresh again at 29120 -> needs a departure at 29420
// (29120+300). Both entries coexist safely: a query at 28800 still finds
// 29100 as its nearest (29420 is later), and a query at 29120 skips the
// now-past 29100 and finds 29420 exactly.
const L1 = lineWithDepartures('L1', [29100, 29420]);
// L2 is only asserted exactly once, boarded at clock 29110 (300s wait ->
// departure at 29410). Every other use of L2 only checks reachability, so
// this single entry (with wraparound for any later query) is sufficient.
const L2 = lineWithDepartures('L2', [29410]);

const scheduleWith = (...lines: Line[]): Schedule => ({
    linesById: new Map(lines.map(line => [line.id, line])),
    dayType: 'weekday',
});

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

        // A->B->C->D on L1 the whole way: one boarding wait (300s, next L1 departure at 29100) + 20s ride.
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

        // A -> B (board L1 at 28800, next departure 29100 -> wait 300 + 10s ride)
        // -> D (board L2 at 29110, next departure 29410 -> wait 300 + 20s ride)
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

    it('uses the simulated clock (start + elapsed) to find the correct upcoming departure', () => {
        // Departures at 8:00 (giving a 300s wait if boarded right at 28800) and
        // 10:20 (giving a 1200s wait if boarded at 10:00).
        const customLine = lineWithDepartures('L1', [PEAK_START + 300, 10 * 3600 + 1200]);
        const schedule = scheduleWith(customLine);
        const lateGraph: TransportGraph = {A: [{to: 'B', duration: 0, routeId: 'L1', patternId: 'L1'}]};

        const {durations: earlyBoarding} = computeShortestPaths(lateGraph, 'A', PEAK_START, schedule);
        expect(earlyBoarding.get(stateKey('B', 'L1'))).toBe(300);

        const {durations: laterBoarding} = computeShortestPaths(lateGraph, 'A', 10 * 3600, schedule);
        expect(laterBoarding.get(stateKey('B', 'L1'))).toBe(1200);
    });

    it('advances the simulated clock across a ride for a later (non-first) boarding', () => {
        // firstLine is boarded once, at 8:00 (28800) -> needs a departure at 29100 for a 300s wait.
        const firstLine = lineWithDepartures('L1', [PEAK_START + 300]);
        // secondLine is boarded once, at 8:00 + 300s wait + 3660s ride = 32760 -> needs
        // a departure at 33960 for a 1200s wait, proving the clock advanced with the
        // ride's elapsed time rather than staying pinned to the first boarding's clock.
        const secondLine = lineWithDepartures('L2', [32760 + 1200]);
        const schedule = scheduleWith(firstLine, secondLine);

        const laterGraph: TransportGraph = {
            // 61-minute ride: boards at 8:00, arrives with cumulative elapsed time 300+3660=3960s.
            A: [{to: 'B', duration: 61 * 60, routeId: 'L1', patternId: 'L1'}],
            // Zero-duration transfer resets the "currently boarded" pattern without adding elapsed time.
            B: [{to: 'C', duration: 0, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
            C: [{to: 'D', duration: 0, routeId: 'L2', patternId: 'L2'}],
        };

        const {durations} = computeShortestPaths(laterGraph, 'A', PEAK_START, schedule);

        // Board L1 at 8:00 (wait 300) + 3660s ride + 0s walk
        // + board L2 at clock 28800+3960=32760 (wait 1200, not the first line's 300).
        // A fixed-clock bug would reuse the first boarding's clock for L2 too.
        expect(durations.get(stateKey('D', 'L2'))).toBe(300 + 61 * 60 + 1200);
    });

    it('resets the boarding state after a transfer edge, forcing a wait on the next ride', () => {
        // Boards L1 twice: once at 8:00 (28800) and again at 28800+300+10+60=29170
        // after the transfer. A single shared departure list can't give exactly
        // 300s at both clocks (a departure placed for the first boarding would
        // become the wrong "nearest" for the second) — use two departures spaced
        // so each boarding's own nearest departure gives exactly 300s.
        const resetLine = lineWithDepartures('L1', [PEAK_START + 300, 29170 + 300]);

        const transferGraph: TransportGraph = {
            A: [{to: 'B', duration: 10, routeId: 'L1', patternId: 'L1'}],
            B: [{to: 'C', duration: 60, routeId: 'TRANSFER', patternId: 'TRANSFER'}],
            C: [{to: 'D', duration: 5, routeId: 'L1', patternId: 'L1'}],
        };

        const {durations} = computeShortestPaths(transferGraph, 'A', PEAK_START, scheduleWith(resetLine));

        // board L1 (wait 300) + 10s ride + 60s walk + board L1 again (wait 300) + 5s ride
        expect(durations.get(stateKey('D', 'L1'))).toBe(300 + 10 + 60 + 300 + 5);
    });

    it('stays fast on a long chain graph (regression guard against an O(V^2) search)', () => {
        const chainLength = 5000;
        const bigGraph: TransportGraph = {};
        for (let i = 0; i < chainLength - 1; i++) {
            bigGraph[`S${i}`] = [{to: `S${i + 1}`, duration: 60, routeId: 'L1', patternId: 'L1'}];
        }

        const start = performance.now();
        const {durations} = computeShortestPaths(bigGraph, 'S0', PEAK_START, scheduleWith(L1));
        const elapsedMs = performance.now() - start;

        // One boarding wait (300s, next L1 departure at 29100) plus the ride itself; only the
        // first hop pays a boarding wait since every subsequent hop continues the same pattern.
        expect(durations.get(stateKey(`S${chainLength - 1}`, 'L1'))).toBe(300 + (chainLength - 1) * 60);
        expect(elapsedMs).toBeLessThan(2000);
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

        // single boarding wait (300s, departure at 29100) + ride time (10+1+1=12s)
        expect(result).toEqual({
            path: ['A', 'B', 'F', 'E'],
            duration: 312,
            arrivals: [0, 300 + 10, 300 + 11, 300 + 12],
            patternIds: [null, 'L1', 'L1', 'L1'],
        });
    });

    it('forces the path through the required station, even if longer, and pays a fresh boarding wait per leg', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', PEAK_START, waypointSchedule, ['D']);

        // leg 1 (A->D via B,C): boards at 28800 (departure 29100) -> wait 300 + ride 10+5+5=20 = 320
        // leg 2 (D->E): boards fresh at 28800+320=29120 (departure 29420) -> wait 300 + ride 3 = 303
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
