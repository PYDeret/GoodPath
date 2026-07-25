const parseGtfsTime = (time) => {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

const groupBy = (records, key) => records.reduce((acc, record) => {
    acc[record[key]] ??= [];
    acc[record[key]].push(record);
    return acc;
}, {});

/**
 * Turns the filtered GTFS records (routes, shapes, stops, stop_times, trips)
 * into the app's `gtfs.json` shape: lines, shapes grouped and ordered by
 * sequence, an adjacency-list `graph` of stop-to-stop travel times, and
 * stations.
 */
export const buildData = (
    routes,
    shapes,
    stops,
    stopTimes,
    trips
) => {
    const data = {
        graph: {},
        stations: [],
        shapes: [],
        lines: [],
    };

    routes.forEach(route => {
        data.lines.push({
            id: route.route_id,
            shortName: route.route_short_name,
            longName: route.route_long_name,
            color: route.route_color,
            textColor: route.route_text_color,
            type: parseInt(route.route_type),
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

    const tripRouteById = Object.fromEntries(trips.map(trip => [trip.trip_id, trip.route_id]));

    const stopTimesByTrip = groupBy(stopTimes, 'trip_id');
    Object.values(stopTimesByTrip).forEach(points =>
        points.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence))
    );

    Object.entries(stopTimesByTrip).forEach(([tripId, points]) => {
        const routeId = tripRouteById[tripId];

        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i].stop_id;
            const to = points[i + 1].stop_id;
            const duration = parseGtfsTime(points[i + 1].arrival_time) - parseGtfsTime(points[i].departure_time);

            data.graph[from] ??= [];
            const edge = data.graph[from].find(edge => edge.to === to);
            if (edge) {
                edge.duration = Math.min(edge.duration, duration);
            } else {
                data.graph[from].push({ to, duration, routeId });
            }
        }
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