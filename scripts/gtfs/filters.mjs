const KEPT_ROUTE_TYPES = ['0', '1', '2'];

export const isKeptRoute = (record) => {
    return KEPT_ROUTE_TYPES.includes(record.route_type) ? record.route_id : null
}

export const isKeptTrip = (record, routeIdSet) => {
    return routeIdSet.has(record.route_id) ? record.trip_id : null
}