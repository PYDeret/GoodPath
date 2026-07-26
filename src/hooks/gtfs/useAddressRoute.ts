import {useMemo} from "react";
import {useGeocodedStation} from "../geo/useGeocodedStation.ts";
import {useShortestPath} from "./useShortestPath.ts";
import {buildPathLegs} from "../../domain/gtfs/pathLegs.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

/**
 * End-to-end address routing: geocodes `fromAddress`/`toAddress` to their
 * nearest stations, computes the shortest path between them, and groups it
 * into per-line legs. `isLoading` covers both geocoding requests.
 */
export function useAddressRoute(data: GtfsData | undefined, fromAddress: string, toAddress: string) {
    const fromStation = useGeocodedStation(data?.stations, fromAddress);
    const toStation = useGeocodedStation(data?.stations, toAddress);

    const {path, duration} = useShortestPath(data?.graph, fromStation.data?.id, toStation.data?.id);

    const legs = useMemo(() => {
        if (!data || !path) {
            return [];
        }

        return buildPathLegs(data.graph, path);
    }, [data, path]);

    return {
        fromStation: fromStation.data,
        toStation: toStation.data,
        path,
        duration,
        legs,
        isLoading: fromStation.isFetching || toStation.isFetching,
    };
}
