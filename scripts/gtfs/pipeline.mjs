import path from 'node:path'
import {readGtfsCsv} from './io.mjs';
import {isKeptRoute, isKeptTrip} from "./filters.mjs";

const routePath = path.resolve(import.meta.dirname, '../../data/gtfs/routes.txt')
const tripPath = path.resolve(import.meta.dirname, '../../data/gtfs/trips.txt')

export async function main() {
    const routeIds = await readGtfsCsv(routePath, isKeptRoute);
    const routeIdSet = new Set(routeIds);
    const tripFilter = (record) => isKeptTrip(record, routeIdSet);
    const tripIds = await readGtfsCsv(tripPath, tripFilter);
    console.log(tripIds.length);
}