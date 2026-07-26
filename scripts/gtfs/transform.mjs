import {parseGtfsTime} from "./time.mjs";
import {computeLineFrequencies} from "./frequencies.mjs";
import {computePatternId} from "./tripPattern.mjs";

const groupBy = (records, key) => records.reduce((acc, record) => {
    acc[record[key]] ??= [];
    acc[record[key]].push(record);
    return acc;
}, {});

// Marks a graph edge as an interchange (walk between platforms/lines at the
// same station complex) rather than a ride on a GTFS route.
// Kept in sync with src/domain/gtfs/transferRouteId.ts.
export const TRANSFER_ROUTE_ID = 'TRANSFER';

const addOrUpdateEdge = (graph, from, to, duration, routeId, patternId) => {
    graph[from] ??= [];
    const edge = graph[from].find(edge => edge.to === to && edge.patternId === patternId);
    if (edge) {
        edge.duration = Math.min(edge.duration, duration);
    } else {
        graph[from].push({to, duration, routeId, patternId});
    }
}

/**
 * Turns the filtered GTFS records (routes, shapes, stops, stop_times, trips,
 * transfers, calendar) into the app's `gtfs.json` shape: lines (each with a
 * precomputed frequency table), shapes grouped and ordered by sequence, an
 * adjacency-list `graph` of stop-to-stop travel times (ride edges from
 * stop_times plus walking interchange edges from transfers), and stations.
 */
export const buildData = (
    routes,
    shapes,
    stops,
    stopTimes,
    trips,
    transfers = [],
    calendar = []
) => {
    const data = {
        graph: {},
        stations: [],
        shapes: [],
        lines: [],
    };

    const tripRouteById = Object.fromEntries(trips.map(trip => [trip.trip_id, trip.route_id]));

    const stopTimesByTrip = groupBy(stopTimes, 'trip_id');
    Object.values(stopTimesByTrip).forEach(points =>
        points.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence))
    );

    const frequenciesByRoute = computeLineFrequencies(routes, trips, calendar, stopTimesByTrip);

    routes.forEach(route => {
        data.lines.push({
            id: route.route_id,
            shortName: route.route_short_name,
            longName: route.route_long_name,
            color: route.route_color,
            textColor: route.route_text_color,
            type: parseInt(route.route_type),
            frequencies: frequenciesByRoute.get(route.route_id),
        });
    });

    data.shapes = shapes.reduce((acc, shape) => {
        acc[shape.shape_id] ??= [];
        acc[shape.shape_id].push({
            shapeLat: parseFloat(shape.shape_pt_lat),
            shapeLon: parseFloat(shape.shape_pt_lon),
            shapeSequence: parseInt(shape.shape_pt_sequence, 10),
        });

        return acc;
    }, {});

    Object.values(data.shapes).forEach(points =>
        points.sort((a, b) => a.shapeSequence - b.shapeSequence)
    );

    Object.entries(stopTimesByTrip).forEach(([tripId, points]) => {
        const routeId = tripRouteById[tripId];
        const patternId = computePatternId(points.map(point => point.stop_id));

        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i].stop_id;
            const to = points[i + 1].stop_id;
            const duration = parseGtfsTime(points[i + 1].departure_time) - parseGtfsTime(points[i].departure_time);

            addOrUpdateEdge(data.graph, from, to, duration, routeId, patternId);
        }
    });

    transfers.forEach(transfer => {
        const duration = parseInt(transfer.min_transfer_time, 10);

        addOrUpdateEdge(data.graph, transfer.from_stop_id, transfer.to_stop_id, duration, TRANSFER_ROUTE_ID, TRANSFER_ROUTE_ID);
        addOrUpdateEdge(data.graph, transfer.to_stop_id, transfer.from_stop_id, duration, TRANSFER_ROUTE_ID, TRANSFER_ROUTE_ID);
    });

    stops.forEach(stop => {
        data.stations.push({
            id: stop.stop_id,
            name: stop.stop_name,
            stopLat: parseFloat(stop.stop_lat),
            stopLon: parseFloat(stop.stop_lon),
            zoneId: stop.zone_id,
        });
    });

    return data;
}
