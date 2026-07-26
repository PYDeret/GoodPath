import {useMemo} from "react";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {PathConstraints} from "../../domain/gtfs/shortestPath.ts";
import {computeShortestPathWithWaypoints} from "../../domain/gtfs/shortestPath.ts";

// Stable reference so an omitted `requiredStations` doesn't invalidate the
// useMemo below on every render (a new `[]` literal would break the cache).
const NO_REQUIRED_STATIONS: string[] = [];

/**
 * Memoized shortest path between two stops of a `TransportGraph`, forced
 * through `requiredStations` in order and honoring optional `constraints`
 * (forbidden stations/lines/edges). Returns `{path: null, duration: null}`
 * until both stop ids are set or no path exists under the given constraints.
 */
export function useShortestPath(
    graph: TransportGraph | undefined,
    fromStopId?: string,
    toStopId?: string,
    requiredStations: string[] = NO_REQUIRED_STATIONS,
    constraints?: PathConstraints
) {
    return useMemo(() => {
        if (!graph || !fromStopId || !toStopId) {
            return {path: null, duration: null};
        }

        const result = computeShortestPathWithWaypoints(graph, fromStopId, toStopId, requiredStations, constraints);

        return result ?? {path: null, duration: null};
    }, [graph, fromStopId, toStopId, requiredStations, constraints]);
}
