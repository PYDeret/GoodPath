const KEPT_ROUTE_TYPES = ['0', '1', '2'];

export const isKeptRoute = (record) => {
    return KEPT_ROUTE_TYPES.includes(record.route_type) ? record : null
}

export const isKeptStop = (record, stopTimeIdSet) => {
    return stopTimeIdSet.has(record.stop_id) ? record : null;
}

export const isKeptStopTime = (record, tripIdSet) => {
    return tripIdSet.has(record.trip_id) ? record.stop_id : null;
}

export const isKeptTrip = (record, routeIdSet) => {
    return routeIdSet.has(record.route_id) ? record.trip_id : null
}