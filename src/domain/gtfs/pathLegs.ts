import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import {TRANSFER_ROUTE_ID} from "./transferRouteId.ts";

export type PathLeg = {
    routeId: string,
    fromStopId: string,
    toStopId: string,
    stopIds: string[],
    duration: number,
    isTransfer: boolean,
}

const findEdge = (graph: TransportGraph, from: string, to: string, patternId: string | null, patternIdsProvided: boolean) => {
    const edges = graph[from] ?? [];

    if (patternId === TRANSFER_ROUTE_ID) {
        return edges.find(edge => edge.to === to && edge.routeId === TRANSFER_ROUTE_ID);
    }

    // If patternIds were explicitly provided, match by pattern; otherwise use old behavior
    if (patternIdsProvided) {
        return edges.find(edge => edge.to === to && edge.patternId === patternId);
    }

    return edges.find(edge => edge.to === to);
}

/**
 * Groups a shortest-path stop sequence into legs of consecutive stops
 * travelled on the same route, for display as "line X from A to B". Each
 * leg's `duration` is the sum of the per-edge elapsed time (`arrivals`,
 * parallel to `path`, as returned by `computeShortestPathWithWaypoints`),
 * so it includes any boarding wait charged on the leg's first edge.
 * `patternIds` (also parallel to `path`) disambiguates which edge was
 * actually taken when several edges connect the same stop pair via
 * different trip patterns. Legs riding an interchange edge (see
 * transferRouteId.ts) are flagged via `isTransfer` so consumers don't need
 * to know the sentinel routeId.
 */
export const buildPathLegs = (graph: TransportGraph, path: string[], arrivals: number[], patternIds?: (string | null)[]): PathLeg[] => {
    const patterns = patternIds ?? Array(path.length).fill(null);
    const patternIdsProvided = patternIds !== undefined;
    const legs: PathLeg[] = [];

    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const routeId = findEdge(graph, from, to, patterns[i + 1], patternIdsProvided)?.routeId;

        if (routeId === undefined) {
            continue;
        }

        const edgeDuration = arrivals[i + 1] - arrivals[i];
        const currentLeg = legs[legs.length - 1];

        if (currentLeg && currentLeg.routeId === routeId) {
            currentLeg.toStopId = to;
            currentLeg.stopIds.push(to);
            currentLeg.duration += edgeDuration;
        } else {
            legs.push({routeId, fromStopId: from, toStopId: to, stopIds: [from, to], duration: edgeDuration, isTransfer: routeId === TRANSFER_ROUTE_ID});
        }
    }

    return legs;
}
