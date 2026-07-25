export const buildData = (routes, shapes, stops) => {
    const data = {
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