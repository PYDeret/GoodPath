import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

export type PathLeg = {
    routeId: string,
    fromStopId: string,
    toStopId: string,
    stopIds: string[],
}

/**
 * Groups a shortest-path stop sequence into legs of consecutive stops
 * travelled on the same route, for display as "line X from A to B".
 */
export const buildPathLegs = (graph: TransportGraph, path: string[]): PathLeg[] => {
    const legs: PathLeg[] = [];

    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const routeId = graph[from]?.find(edge => edge.to === to)?.routeId;

        if (routeId === undefined) {
            continue;
        }

        const currentLeg = legs[legs.length - 1];
        if (currentLeg && currentLeg.routeId === routeId) {
            currentLeg.toStopId = to;
            currentLeg.stopIds.push(to);
        } else {
            legs.push({routeId, fromStopId: from, toStopId: to, stopIds: [from, to]});
        }
    }

    return legs;
}
