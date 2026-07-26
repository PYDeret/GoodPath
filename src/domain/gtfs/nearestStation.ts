import type {Station} from "../../types/gtfs/gtfsStation.ts";
import {haversineDistance} from "../geo/haversine.ts";

/**
 * The station closest (straight-line) to a given lat/lon point, used to snap
 * a geocoded address to the transport network. Returns null for an empty
 * station list.
 */
export const findNearestStation = (stations: Station[], lat: number, lon: number): Station | null => {
    let nearest: Station | null = null;
    let nearestDistance = Infinity;

    for (const station of stations) {
        const distance = haversineDistance(lat, lon, station.stopLat, station.stopLon);
        if (distance < nearestDistance) {
            nearest = station;
            nearestDistance = distance;
        }
    }

    return nearest;
}
