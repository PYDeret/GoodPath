import {useMemo} from "react";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {PathConstraints} from "../../domain/gtfs/shortestPath.ts";
import {computeShortestPathWithWaypoints} from "../../domain/gtfs/shortestPath.ts";

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
    requiredStations: string[] = [],
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
