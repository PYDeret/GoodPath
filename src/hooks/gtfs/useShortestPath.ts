import {useMemo} from "react";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import {buildPath, computeShortestPaths} from "../../domain/gtfs/shortestPath.ts";

export function useShortestPath(graph: TransportGraph | undefined, fromStopId?: string, toStopId?: string) {
    return useMemo(() => {
        if (!graph || !fromStopId || !toStopId) {
            return {path: null, duration: null};
        }

        const {durations, previous} = computeShortestPaths(graph, fromStopId);
        const duration = durations.get(toStopId);

        if (duration === undefined) {
            return {path: null, duration: null};
        }

        return {path: buildPath(previous, toStopId), duration};
    }, [graph, fromStopId, toStopId]);
}
