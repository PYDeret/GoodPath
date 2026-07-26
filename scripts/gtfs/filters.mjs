// Row predicates for scripts/gtfs/pipeline.mjs: each returns the record to
// keep it, or null to drop it, based on a set built from the previous pass.
// isKeptTransfer additionally drops transfer_type 3 ("not possible").
const KEPT_ROUTE_TYPES = ['0', '1', '2'];

export const isKeptRoute = (record) => {
    return KEPT_ROUTE_TYPES.includes(record.route_type) ? record : null
}

// Factory for the common "keep this record if record[field] is in idSet" shape.
const keepIfIdIn = (field) => (record, idSet) => idSet.has(record[field]) ? record : null;

export const isKeptShape = keepIfIdIn('shape_id');
export const isKeptStop = keepIfIdIn('stop_id');
export const isKeptStopTime = keepIfIdIn('trip_id');
export const isKeptTrip = keepIfIdIn('route_id');

export const isKeptTransfer = (record, stopIdSet) => {
    if (record.transfer_type === '3') {
        return null;
    }

    return stopIdSet.has(record.from_stop_id) && stopIdSet.has(record.to_stop_id) ? record : null;
}

export const isKeptCalendar = (record, serviceIdSet) => {
    return serviceIdSet.has(record.service_id) ? record : null;
}