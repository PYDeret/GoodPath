export const buildData = (routes, stops) => {
    const data = {
        stations: [],
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