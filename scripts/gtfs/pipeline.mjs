import path from 'node:path'
import {createJson, readGtfsCsv} from './io.mjs';
import {isKeptRoute, isKeptShape, isKeptStop, isKeptStopTime, isKeptTransfer, isKeptTrip} from "./filters.mjs";

const routePath = path.resolve(import.meta.dirname, '../../data/gtfs/routes.txt');
const shapesPath = path.resolve(import.meta.dirname, '../../data/gtfs/shapes.txt');
const stopPath = path.resolve(import.meta.dirname, '../../data/gtfs/stops.txt');
const stopTimePath = path.resolve(import.meta.dirname, '../../data/gtfs/stop_times.txt');
const tripPath = path.resolve(import.meta.dirname, '../../data/gtfs/trips.txt');
const transfersPath = path.resolve(import.meta.dirname, '../../data/gtfs/transfers.txt');
const jsonPath = path.resolve(import.meta.dirname, '../../public/data/gtfs.json');

export async function main() {
    const routes = await readGtfsCsv(routePath, isKeptRoute);
    const routeIdSet = new Set(routes.map(route => route.route_id));
    const tripFilter = (record) => isKeptTrip(record, routeIdSet);
    const trips = await readGtfsCsv(tripPath, tripFilter);
    const tripIdSet = new Set(trips.map(trip => trip.trip_id));
    const tripShapeIdSet = new Set(trips.map(trip => trip.shape_id));

    const stopTimeFilter = (record) => isKeptStopTime(record, tripIdSet);
    const stopTimes = await readGtfsCsv(stopTimePath, stopTimeFilter);
    const stopTimeSet = new Set(stopTimes.map(stopTime => stopTime.stop_id));

    const stopFilter = (record) => isKeptStop(record, stopTimeSet);
    const stops = await readGtfsCsv(stopPath, stopFilter);

    const shapeFilter = (record) => isKeptShape(record, tripShapeIdSet);
    const shapes = await readGtfsCsv(shapesPath, shapeFilter);

    const stopIdSet = new Set(stops.map(stop => stop.stop_id));
    const transferFilter = (record) => isKeptTransfer(record, stopIdSet);
    const transfers = await readGtfsCsv(transfersPath, transferFilter);

    createJson(
        routes,
        shapes,
        stops,
        stopTimes,
        trips,
        transfers,
        jsonPath
    );
}