import type {Station} from "../../types/gtfs/gtfsStation.ts";

const normalize = (value: string): string =>
    value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Up to `limit` stations whose name contains `query` (accent- and
 * case-insensitive), with names that *start with* the query ranked ahead
 * of names where it merely appears elsewhere.
 */
export function searchStations(stations: Station[], query: string, limit: number): Station[] {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
        return [];
    }

    return stations
        .filter(station => normalize(station.name).includes(normalizedQuery))
        .sort((a, b) => {
            const aStarts = normalize(a.name).startsWith(normalizedQuery) ? 0 : 1;
            const bStarts = normalize(b.name).startsWith(normalizedQuery) ? 0 : 1;
            return aStarts - bStarts;
        })
        .slice(0, limit);
}
