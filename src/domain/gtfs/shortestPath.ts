import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

export type PathResult = {
    durations: Map<string, number>,
    previous: Map<string, string>,
}

export type PathConstraints = {
    forbiddenStations?: Set<string>,
    forbiddenLines?: Set<string>,
    forbiddenEdges?: Set<string>,
}

const edgeKey = (from: string, to: string) => `${from}>${to}`;

/**
 * Dijkstra's algorithm over a `TransportGraph`: returns the shortest
 * cumulative duration from `fromStopId` to every reachable stop, plus the
 * predecessor of each stop on its shortest path (feed to `buildPath` to get
 * the ordered route to a given destination). `constraints` excludes stations,
 * lines (routeId) or specific `from>to` edges from the traversal entirely.
 */
export const computeShortestPaths = (graph: TransportGraph, fromStopId: string, constraints: PathConstraints = {}): PathResult => {
    const durations = new Map<string, number>([[fromStopId, 0]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const queue = new Set<string>([fromStopId]);

    while (queue.size > 0) {
        const current = [...queue].reduce((closest, stopId) =>
            (durations.get(stopId) ?? Infinity) < (durations.get(closest) ?? Infinity) ? stopId : closest
        );

        queue.delete(current);
        visited.add(current);

        for (const edge of graph[current] ?? []) {
            if (visited.has(edge.to)) {
                continue;
            }

            if (constraints.forbiddenStations?.has(edge.to)) {
                continue;
            }

            if (constraints.forbiddenLines?.has(edge.routeId)) {
                continue;
            }

            if (constraints.forbiddenEdges?.has(edgeKey(current, edge.to))) {
                continue;
            }

            const duration = (durations.get(current) ?? Infinity) + edge.duration;
            if (duration < (durations.get(edge.to) ?? Infinity)) {
                durations.set(edge.to, duration);
                previous.set(edge.to, current);
                queue.add(edge.to);
            }
        }
    }

    return {durations, previous};
}

/**
 * Reconstructs the ordered list of stops from a `computeShortestPaths`
 * predecessor map, ending at `toStopId`.
 */
export const buildPath = (previous: Map<string, string>, toStopId: string): string[] => {
    const path = [toStopId];
    let current = toStopId;

    while (previous.has(current)) {
        current = previous.get(current)!;
        path.unshift(current);
    }

    return path;
}

export type WaypointPathResult = {
    path: string[],
    duration: number,
}

/**
 * Shortest path from `fromStopId` to `toStopId` forced through
 * `requiredStations` in order, by chaining Dijkstra leg by leg (each leg
 * under the same `constraints`). Returns null if any leg is unreachable.
 */
export const computeShortestPathWithWaypoints = (
    graph: TransportGraph,
    fromStopId: string,
    toStopId: string,
    requiredStations: string[] = [],
    constraints: PathConstraints = {}
): WaypointPathResult | null => {
    const stops = [fromStopId, ...requiredStations, toStopId];
    const path = [stops[0]];
    let duration = 0;

    for (let i = 0; i < stops.length - 1; i++) {
        const {durations, previous} = computeShortestPaths(graph, stops[i], constraints);
        const legDuration = durations.get(stops[i + 1]);

        if (legDuration === undefined) {
            return null;
        }

        duration += legDuration;
        path.push(...buildPath(previous, stops[i + 1]).slice(1));
    }

    return {path, duration};
}
