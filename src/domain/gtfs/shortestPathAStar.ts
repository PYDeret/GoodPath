import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {PathConstraints} from "./shortestPath.ts";
import {buildPath, edgeKey} from "./shortestPath.ts";
import {haversineDistance} from "../geo/haversine.ts";

// ponytail: fastest plausible transit speed, so the heuristic never overestimates real travel time (keeps A* admissible)
const MAX_SPEED_METERS_PER_SECOND = 20;

const heuristic = (stationsById: Record<string, Station>, fromId: string, toId: string): number => {
    const from = stationsById[fromId];
    const to = stationsById[toId];

    if (!from || !to) {
        return 0;
    }

    return haversineDistance(from.stopLat, from.stopLon, to.stopLat, to.stopLon) / MAX_SPEED_METERS_PER_SECOND;
}

export type AStarPathResult = {
    path: string[],
    duration: number,
}

/**
 * A* over a `TransportGraph`, using straight-line distance to `toStopId`
 * (converted to a lower-bound travel time) as the heuristic. Same result as
 * `computeShortestPaths` + `buildPath`, but explores fewer stops. Requires
 * `stationsById` for coordinates; falls back to Dijkstra-like behavior for
 * any stop missing from it. Returns null if `toStopId` is unreachable.
 */
export const computeShortestPathAStar = (
    graph: TransportGraph,
    stationsById: Record<string, Station>,
    fromStopId: string,
    toStopId: string,
    constraints: PathConstraints = {}
): AStarPathResult | null => {
    const gScore = new Map<string, number>([[fromStopId, 0]]);
    const fScore = new Map<string, number>([[fromStopId, heuristic(stationsById, fromStopId, toStopId)]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const open = new Set<string>([fromStopId]);

    while (open.size > 0) {
        const current = [...open].reduce((closest, stopId) =>
            (fScore.get(stopId) ?? Infinity) < (fScore.get(closest) ?? Infinity) ? stopId : closest
        );

        if (current === toStopId) {
            return {path: buildPath(previous, toStopId), duration: gScore.get(current)!};
        }

        open.delete(current);
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

            const tentativeGScore = (gScore.get(current) ?? Infinity) + edge.duration;
            if (tentativeGScore < (gScore.get(edge.to) ?? Infinity)) {
                previous.set(edge.to, current);
                gScore.set(edge.to, tentativeGScore);
                fScore.set(edge.to, tentativeGScore + heuristic(stationsById, edge.to, toStopId));
                open.add(edge.to);
            }
        }
    }

    return null;
}
