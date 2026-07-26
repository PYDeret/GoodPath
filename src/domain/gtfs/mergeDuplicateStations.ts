import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

export type MergedStation = {
    id: string,
    name: string,
    lines: Line[],
}

/**
 * Collapses stations sharing the same name (separate GTFS records for the
 * same physical place, e.g. different stop-place granularities) into one
 * suggestion per name: the union of their lines for display, and the id of
 * the best-connected station (most lines) as the canonical id for routing.
 */
export function mergeDuplicateStations(stations: Station[], linesByStation: Map<string, Line[]>): MergedStation[] {
    const groups = new Map<string, Station[]>();
    for (const station of stations) {
        if (!groups.has(station.name)) {
            groups.set(station.name, []);
        }
        groups.get(station.name)!.push(station);
    }

    return [...groups.entries()].map(([name, group]) => {
        const canonical = group.reduce((best, current) =>
            (linesByStation.get(current.id)?.length ?? 0) > (linesByStation.get(best.id)?.length ?? 0) ? current : best
        );

        const lineById = new Map<string, Line>();
        for (const station of group) {
            for (const line of linesByStation.get(station.id) ?? []) {
                lineById.set(line.id, line);
            }
        }

        return {
            id: canonical.id,
            name,
            lines: [...lineById.values()].sort((a, b) => a.shortName.localeCompare(b.shortName)),
        };
    });
}
