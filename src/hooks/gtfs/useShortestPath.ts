import {useMemo} from "react";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {PathConstraints, Schedule} from "../../domain/gtfs/shortestPath.ts";
import {computeShortestPathWithWaypoints} from "../../domain/gtfs/shortestPath.ts";
import {dayTypeForDate} from "../../domain/gtfs/dayType.ts";

// Stable reference so an omitted `requiredStations` doesn't invalidate the
// useMemo below on every render (a new `[]` literal would break the cache).
const NO_REQUIRED_STATIONS: string[] = [];
const NO_RESULT = {path: null, duration: null, arrivals: []};

export type UseShortestPathOptions = {
    requiredStations?: string[],
    constraints?: PathConstraints,
    departureDate?: Date,
}

const secondsSinceMidnight = (date: Date) => date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

/**
 * Memoized shortest path between two stops of a `TransportGraph`, forced
 * through `options.requiredStations` in order and honoring optional
 * `options.constraints` (forbidden stations/lines/edges). Path selection
 * accounts for estimated train wait times (see domain/gtfs/shortestPath.ts),
 * using `lines`' frequency data and `options.departureDate` (defaults to
 * now) to pick the time-of-day bucket. Returns `{path: null, duration:
 * null, arrivals: []}` until both stop ids and `lines` are set, or no path
 * exists under the given constraints.
 */
export function useShortestPath(
    graph: TransportGraph | undefined,
    fromStopId?: string,
    toStopId?: string,
    lines?: Line[],
    options: UseShortestPathOptions = {}
) {
    const {requiredStations = NO_REQUIRED_STATIONS, constraints, departureDate} = options;

    return useMemo(() => {
        if (!graph || !fromStopId || !toStopId || !lines) {
            return NO_RESULT;
        }

        const date = departureDate ?? new Date();
        const schedule: Schedule = {
            linesById: new Map(lines.map(line => [line.id, line])),
            dayType: dayTypeForDate(date),
        };

        const result = computeShortestPathWithWaypoints(
            graph, fromStopId, toStopId, secondsSinceMidnight(date), schedule, requiredStations, constraints
        );

        return result ?? NO_RESULT;
    }, [graph, fromStopId, toStopId, lines, requiredStations, constraints, departureDate]);
}
