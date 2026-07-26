import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {DayType} from "./dayType.ts";
import {computeBoardingWaitSeconds} from "./boardingWait.ts";
import {TRANSFER_ROUTE_ID} from "./transferRouteId.ts";

export type PathResult = {
    durations: Map<string, number>,
    previous: Map<string, string>,
}

export type PathConstraints = {
    forbiddenStations?: Set<string>,
    forbiddenLines?: Set<string>,
    forbiddenEdges?: Set<string>,
}

export type Schedule = {
    linesById: Map<string, Line>,
    dayType: DayType,
}

export const edgeKey = (from: string, to: string) => `${from}>${to}`;

const START_ROUTE = '';
/** Search-state key: a stop plus the route currently being ridden (or none). */
export const stateKey = (stopId: string, routeId: string | null) => `${stopId}|${routeId ?? START_ROUTE}`;
export const stopIdOf = (state: string) => state.split('|')[0];
const routeIdOf = (state: string): string | null => {
    const routeId = state.split('|')[1];
    return routeId === START_ROUTE ? null : routeId;
}

/**
 * Time-dependent Dijkstra over a `TransportGraph`. Search state is
 * (stopId, currently-ridden routeId | null): continuing a ride is free, but
 * boarding a new one (including the very first boarding, and right after a
 * `TRANSFER_ROUTE_ID` walking edge) pays an estimated wait based on that
 * line's frequency at the simulated clock time (`startTimeSeconds` plus
 * cumulative elapsed time so far). Returns cumulative elapsed seconds (not
 * clock time) per state, plus each state's predecessor state (feed to
 * `buildPath`). `constraints` excludes stations, lines (routeId) or specific
 * `from>to` edges from the traversal entirely.
 */
export const computeShortestPaths = (
    graph: TransportGraph,
    fromStopId: string,
    startTimeSeconds: number,
    schedule: Schedule,
    constraints: PathConstraints = {}
): PathResult => {
    const start = stateKey(fromStopId, null);
    const durations = new Map<string, number>([[start, 0]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const queue = new Set<string>([start]);

    while (queue.size > 0) {
        const current = [...queue].reduce((closest, state) =>
            (durations.get(state) ?? Infinity) < (durations.get(closest) ?? Infinity) ? state : closest
        );

        queue.delete(current);
        visited.add(current);

        const currentStopId = stopIdOf(current);
        const currentRouteId = routeIdOf(current);
        const currentDuration = durations.get(current)!;

        for (const edge of graph[currentStopId] ?? []) {
            if (constraints.forbiddenStations?.has(edge.to)) {
                continue;
            }
            if (constraints.forbiddenLines?.has(edge.routeId)) {
                continue;
            }
            if (constraints.forbiddenEdges?.has(edgeKey(currentStopId, edge.to))) {
                continue;
            }

            const isTransfer = edge.routeId === TRANSFER_ROUTE_ID;
            const isContinuing = !isTransfer && edge.routeId === currentRouteId;
            const nextRouteId = isTransfer ? null : edge.routeId;
            const nextState = stateKey(edge.to, nextRouteId);

            if (visited.has(nextState)) {
                continue;
            }

            const boardingWait = isContinuing || isTransfer
                ? 0
                : computeBoardingWaitSeconds(schedule.linesById.get(edge.routeId), schedule.dayType, startTimeSeconds + currentDuration);

            const nextDuration = currentDuration + boardingWait + edge.duration;

            if (nextDuration < (durations.get(nextState) ?? Infinity)) {
                durations.set(nextState, nextDuration);
                previous.set(nextState, current);
                queue.add(nextState);
            }
        }
    }

    return {durations, previous};
}

/**
 * Reconstructs the ordered list of stops from a `computeShortestPaths`
 * predecessor map, ending at state `endState`.
 */
export const buildPath = (previous: Map<string, string>, endState: string): string[] => {
    const path = [stopIdOf(endState)];
    let current = endState;

    while (previous.has(current)) {
        current = previous.get(current)!;
        path.unshift(stopIdOf(current));
    }

    return path;
}

const bestArrivalState = (durations: Map<string, number>, stopId: string): {state: string, duration: number} | undefined => {
    let best: {state: string, duration: number} | undefined;

    for (const [state, duration] of durations) {
        if (stopIdOf(state) !== stopId) {
            continue;
        }
        if (!best || duration < best.duration) {
            best = {state, duration};
        }
    }

    return best;
}

const reconstructWithArrivals = (durations: Map<string, number>, previous: Map<string, string>, endState: string): {path: string[], arrivals: number[]} => {
    const path = [stopIdOf(endState)];
    const arrivals = [durations.get(endState)!];
    let current = endState;

    while (previous.has(current)) {
        current = previous.get(current)!;
        path.unshift(stopIdOf(current));
        arrivals.unshift(durations.get(current)!);
    }

    return {path, arrivals};
}

export type WaypointPathResult = {
    path: string[],
    duration: number,
    arrivals: number[],
}

/**
 * Shortest path from `fromStopId` to `toStopId` forced through
 * `requiredStations` in order, departing at `startTimeSeconds` under
 * `schedule`, by chaining time-dependent Dijkstra leg by leg. Each leg's
 * search starts fresh with no carried-over "currently boarded" line, so a
 * required waypoint always pays a fresh boarding wait even if the same line
 * continues through it (accepted imprecision). `arrivals[i]` is the
 * cumulative elapsed seconds at `path[i]`. Returns null if any leg is
 * unreachable.
 */
export const computeShortestPathWithWaypoints = (
    graph: TransportGraph,
    fromStopId: string,
    toStopId: string,
    startTimeSeconds: number,
    schedule: Schedule,
    requiredStations: string[] = [],
    constraints: PathConstraints = {}
): WaypointPathResult | null => {
    const stops = [fromStopId, ...requiredStations, toStopId];
    const path = [stops[0]];
    const arrivals = [0];
    let duration = 0;

    for (let i = 0; i < stops.length - 1; i++) {
        const {durations, previous} = computeShortestPaths(graph, stops[i], startTimeSeconds + duration, schedule, constraints);
        const arrival = bestArrivalState(durations, stops[i + 1]);

        if (!arrival) {
            return null;
        }

        const leg = reconstructWithArrivals(durations, previous, arrival.state);
        path.push(...leg.path.slice(1));
        arrivals.push(...leg.arrivals.slice(1).map(a => a + duration));
        duration += arrival.duration;
    }

    return {path, duration, arrivals};
}
