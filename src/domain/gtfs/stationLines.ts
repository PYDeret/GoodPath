import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";
import {TRANSFER_ROUTE_ID} from "./transferRouteId.ts";

/**
 * Maps each station id to the lines that serve it (sorted by short name),
 * derived once from the graph's ride edges (transfer/walking edges are
 * excluded). Computed entirely from data already in `gtfs.json` — no
 * build-pipeline changes.
 */
export function linesByStation(graph: TransportGraph, lines: Line[]): Map<string, Line[]> {
    const lineById = new Map(lines.map(line => [line.id, line]));
    const lineIdsByStation = new Map<string, Set<string>>();

    const addLineId = (stationId: string, lineId: string) => {
        if (!lineIdsByStation.has(stationId)) {
            lineIdsByStation.set(stationId, new Set());
        }
        lineIdsByStation.get(stationId)!.add(lineId);
    };

    for (const [from, edges] of Object.entries(graph)) {
        for (const edge of edges) {
            if (edge.routeId === TRANSFER_ROUTE_ID) {
                continue;
            }
            addLineId(from, edge.routeId);
            addLineId(edge.to, edge.routeId);
        }
    }

    const result = new Map<string, Line[]>();
    for (const [stationId, lineIds] of lineIdsByStation) {
        const stationLineList = [...lineIds]
            .map(lineId => lineById.get(lineId))
            .filter((line): line is Line => line !== undefined)
            .sort((a, b) => a.shortName.localeCompare(b.shortName));
        result.set(stationId, stationLineList);
    }

    return result;
}
