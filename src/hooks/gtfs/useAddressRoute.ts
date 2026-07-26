import {useMemo} from "react";
import {useGeocodedStation} from "../geo/useGeocodedStation.ts";
import {useShortestPath} from "./useShortestPath.ts";
import {buildPathLegs} from "../../domain/gtfs/pathLegs.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

/**
 * End-to-end address routing: resolves `fromAddress`/`toAddress` to their
 * nearest stations (geocoding via BAN), unless a `fromStationId`/
 * `toStationId` is given for a field — in which case that station is
 * looked up directly from `data.stations`, skipping BAN entirely for that
 * field (the corresponding address is passed to `useGeocodedStation` as an
 * empty string, which its own `enabled` check already treats as
 * disabled). Computes the shortest schedule-aware path between the two
 * resolved stations for a departure at `departureDate` (defaults to now),
 * and groups it into per-line legs. `isLoading` covers only the geocoding
 * requests actually made — a direct station id never triggers a fetch.
 */
export function useAddressRoute(
    data: GtfsData | undefined,
    fromAddress: string,
    toAddress: string,
    departureDate?: Date,
    fromStationId?: string,
    toStationId?: string
) {
    const fromGeocoded = useGeocodedStation(data?.stations, fromStationId ? '' : fromAddress);
    const toGeocoded = useGeocodedStation(data?.stations, toStationId ? '' : toAddress);

    const fromStation = fromStationId
        ? data?.stations.find(station => station.id === fromStationId)
        : fromGeocoded.data;
    const toStation = toStationId
        ? data?.stations.find(station => station.id === toStationId)
        : toGeocoded.data;

    const {path, duration, arrivals, patternIds} = useShortestPath(
        data?.graph, fromStation?.id, toStation?.id, data?.lines, {departureDate}
    );

    const legs = useMemo(() => {
        if (!data || !path) {
            return [];
        }
        return buildPathLegs(data.graph, path, arrivals, patternIds);
    }, [data, path, arrivals, patternIds]);

    return {
        fromStation,
        toStation,
        path,
        duration,
        legs,
        isLoading: (!fromStationId && fromGeocoded.isFetching) || (!toStationId && toGeocoded.isFetching),
    };
}
