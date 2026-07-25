import {useQuery} from "@tanstack/react-query";
import {geocodeAddress} from "../../services/geo/geocodeAddress.ts";
import {findNearestStation} from "../../domain/gtfs/nearestStation.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";

/**
 * Resolves a free-text address to the nearest station: geocodes it (BAN API)
 * then snaps the result to `stations`. Disabled until both `address` and
 * `stations` are available.
 */
export function useGeocodedStation(stations: Station[] | undefined, address: string) {
    return useQuery({
        queryKey: ['geocode', address, stations?.length],
        queryFn: async () => {
            const geocoded = await geocodeAddress(address);
            if (!geocoded) {
                return null;
            }
            return findNearestStation(stations!, geocoded.lat, geocoded.lon);
        },
        enabled: address.trim().length > 0 && !!stations,
    });
}
