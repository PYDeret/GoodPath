import {useMemo} from "react";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {PathConstraints} from "../../domain/gtfs/shortestPath.ts";
import {buildPath, computeShortestPaths} from "../../domain/gtfs/shortestPath.ts";

/**
 * Memoized shortest path between two stops of a `TransportGraph`, honoring
 * optional `constraints` (forbidden stations/lines/edges). Returns
 * `{path: null, duration: null}` until both stop ids are set or no path
 * exists between them under the given constraints.
 */
export function useShortestPath(
    graph: TransportGraph | undefined,
    fromStopId?: string,
    toStopId?: string,
    constraints?: PathConstraints
) {
    return useMemo(() => {
        if (!graph || !fromStopId || !toStopId) {
            return {path: null, duration: null};
        }

        const {durations, previous} = computeShortestPaths(graph, fromStopId, constraints);
        const duration = durations.get(toStopId);

        if (duration === undefined) {
            return {path: null, duration: null};
        }

        return {path: buildPath(previous, toStopId), duration};
    }, [graph, fromStopId, toStopId, constraints]);
}
