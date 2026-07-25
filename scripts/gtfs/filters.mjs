// Row predicates for scripts/gtfs/pipeline.mjs: each returns the record to
// keep it, or null to drop it, based on a set built from the previous pass.
// isKeptTransfer additionally drops transfer_type 3 ("not possible").
const KEPT_ROUTE_TYPES = ['0', '1', '2'];

export const isKeptRoute = (record) => {
    return KEPT_ROUTE_TYPES.includes(record.route_type) ? record : null
}

export const isKeptShape = (record, tripShapeIdSet) => {
    return tripShapeIdSet.has(record.shape_id) ? record : null;
}

export const isKeptStop = (record, stopTimeIdSet) => {
    return stopTimeIdSet.has(record.stop_id) ? record : null;
}

export const isKeptStopTime = (record, tripIdSet) => {
    return tripIdSet.has(record.trip_id) ? record : null;
}

export const isKeptTrip = (record, routeIdSet) => {
    return routeIdSet.has(record.route_id) ? record : null
}

export const isKeptTransfer = (record, stopIdSet) => {
    if (record.transfer_type === '3') {
        return null;
    }
    return stopIdSet.has(record.from_stop_id) && stopIdSet.has(record.to_stop_id) ? record : null;
}