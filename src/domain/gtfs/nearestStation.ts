import type {Station} from "../../types/gtfs/gtfsStation.ts";
import {haversineDistance} from "../geo/haversine.ts";

/**
 * The station closest (straight-line) to a given lat/lon point, used to snap
 * a geocoded address to the transport network. Returns null for an empty
 * station list.
 */
export const findNearestStation = (stations: Station[], lat: number, lon: number): Station | null => {
    return stations.reduce<Station | null>((nearest, station) => {
        const distance = haversineDistance(lat, lon, station.stopLat, station.stopLon);
        const nearestDistance = nearest ? haversineDistance(lat, lon, nearest.stopLat, nearest.stopLon) : Infinity;

        return distance < nearestDistance ? station : nearest;
    }, null);
}
