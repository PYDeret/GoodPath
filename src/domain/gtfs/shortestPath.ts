import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {DayType} from "./dayType.ts";
import {computeBoardingWaitSeconds} from "./boardingWait.ts";
import {TRANSFER_ROUTE_ID} from "./transferRouteId.ts";
import {MinHeap} from "./minHeap.ts";

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

const START_PATTERN = '';
/** Search-state key: a stop plus the trip pattern currently being ridden (or none). */
export const stateKey = (stopId: string, patternId: string | null) => `${stopId}|${patternId ?? START_PATTERN}`;
export const stopIdOf = (state: string) => state.split('|')[0];
const patternIdOf = (state: string): string | null => {
    const patternId = state.split('|')[1];
    return patternId === START_PATTERN ? null : patternId;
}

/**
 * Time-dependent Dijkstra over a `TransportGraph`. Search state is
 * (stopId, currently-ridden patternId | null): continuing a ride on the
 * same physical trip pattern is free, but boarding a new one — including
 * the very first boarding, right after a `TRANSFER_ROUTE_ID` walking edge,
 * or switching to a *different pattern of the same line* — pays an
 * estimated wait until that line's next real departure at or after the
 * simulated clock time (`startTimeSeconds` plus cumulative elapsed time so
 * far). While mid-ride
 * (already boarded some pattern), switching to a *different pattern of that
 * same route id* is not merely costly, it's forbidden entirely: only an
 * actual `TRANSFER_ROUTE_ID` edge (or the search's start) may change which
 * pattern of a given line is "currently boarded" — this prevents the search
 * from assembling a composite of two different real trips' fastest
 * sub-segments into a ride no single physical train provides. Switching to
 * a genuinely different line (different `routeId`) at a shared stop remains
 * allowed without a transfer, since that's a real, valid line change.
 * Returns cumulative elapsed seconds (not clock time) per state, plus each
 * state's predecessor state (feed to `buildPath`). `constraints` excludes
 * stations, lines (routeId) or specific `from>to` edges from the traversal
 * entirely.
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
    const queue = new MinHeap<string>();
    queue.push(start, 0);
    const routeIdByPattern = new Map<string, string>();

    while (queue.size > 0) {
        const current = queue.pop()!;

        if (visited.has(current)) {
            continue;
        }
        visited.add(current);

        const currentStopId = stopIdOf(current);
        const currentPatternId = patternIdOf(current);
        const currentDuration = durations.get(current)!;
        const currentRouteId = currentPatternId ? routeIdByPattern.get(currentPatternId) : undefined;

        for (const edge of graph[currentStopId] ?? []) {
            if (!routeIdByPattern.has(edge.patternId)) {
                routeIdByPattern.set(edge.patternId, edge.routeId);
            }

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
            const isContinuing = !isTransfer && edge.patternId === currentPatternId;
            const canBoardFreely = currentPatternId === null || currentPatternId === TRANSFER_ROUTE_ID;

            if (!isTransfer && !isContinuing && !canBoardFreely && edge.routeId === currentRouteId) {
                continue;
            }

            const nextPatternId = edge.patternId;
            const nextState = stateKey(edge.to, nextPatternId);

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
                queue.push(nextState, nextDuration);
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

const reconstructWithArrivals = (durations: Map<string, number>, previous: Map<string, string>, endState: string): {path: string[], arrivals: number[], patternIds: (string | null)[]} => {
    const path = [stopIdOf(endState)];
    const arrivals = [durations.get(endState)!];
    const patternIds = [patternIdOf(endState)];
    let current = endState;

    while (previous.has(current)) {
        current = previous.get(current)!;
        path.unshift(stopIdOf(current));
        arrivals.unshift(durations.get(current)!);
        patternIds.unshift(patternIdOf(current));
    }

    return {path, arrivals, patternIds};
}

export type WaypointPathResult = {
    path: string[],
    duration: number,
    arrivals: number[],
    patternIds: (string | null)[],
}

/**
 * Shortest path from `fromStopId` to `toStopId` forced through
 * `requiredStations` in order, departing at `startTimeSeconds` under
 * `schedule`, by chaining time-dependent Dijkstra leg by leg. Each leg's
 * search starts fresh with no carried-over "currently boarded" pattern, so
 * a required waypoint always pays a fresh boarding wait even if the same
 * line continues through it (accepted imprecision). `arrivals[i]` is the
 * cumulative elapsed seconds at `path[i]`; `patternIds[i]` is the pattern
 * id of the edge that arrived at `path[i]` (`patternIds[0]` is always
 * `null`). Returns null if any leg is unreachable.
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
    const patternIds: (string | null)[] = [null];
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
        patternIds.push(...leg.patternIds.slice(1));
        duration += arrival.duration;
    }

    return {path, duration, arrivals, patternIds};
}
