import {parseGtfsTime} from "./time.mjs";
import {computePatternId} from "./tripPattern.mjs";

const SECONDS_PER_DAY = 86400;
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND_DAYS = ['saturday', 'sunday'];

const dayTypesForService = (calendarRow) => {
    const dayTypes = [];
    if (WEEKDAYS.some(day => calendarRow[day] === '1')) {
        dayTypes.push('weekday');
    }
    if (WEEKEND_DAYS.some(day => calendarRow[day] === '1')) {
        dayTypes.push('weekend');
    }
    return dayTypes;
}

/**
 * Real departure times (seconds since midnight, normalized to a single
 * day via modulo so a past-midnight GTFS time like "25:30:00" lines up
 * with an early-morning query) per route and day type, derived from each
 * trip's first stop_time as its representative departure. Sorted
 * ascending; deduplicated per route+dayType by pattern+departure-time
 * signature so calendar-exception variants of the same physical service
 * aren't counted twice.
 */
export const computeLineDepartureTimes = (routes, trips, calendar, stopTimesByTrip) => {
    const dayTypesByServiceId = new Map(calendar.map(row => [row.service_id, dayTypesForService(row)]));
    const departuresByRoute = new Map();
    const seenSignaturesByDayType = new Map();

    trips.forEach(trip => {
        const points = stopTimesByTrip[trip.trip_id];
        if (!points || points.length === 0) {
            return;
        }

        const startSeconds = parseGtfsTime(points[0].departure_time) % SECONDS_PER_DAY;
        const dayTypes = dayTypesByServiceId.get(trip.service_id) ?? [];
        const patternId = computePatternId(points.map(point => point.stop_id));
        const signature = `${patternId}|${points[0].departure_time}`;

        if (!departuresByRoute.has(trip.route_id)) {
            departuresByRoute.set(trip.route_id, {weekday: [], weekend: []});
        }
        const departures = departuresByRoute.get(trip.route_id);

        dayTypes.forEach(dayType => {
            const seenKey = `${trip.route_id}|${dayType}`;
            if (!seenSignaturesByDayType.has(seenKey)) {
                seenSignaturesByDayType.set(seenKey, new Set());
            }
            const seen = seenSignaturesByDayType.get(seenKey);

            if (seen.has(signature)) {
                return;
            }
            seen.add(signature);
            departures[dayType].push(startSeconds);
        });
    });

    const departureTimesByRoute = new Map();

    routes.forEach(route => {
        const departures = departuresByRoute.get(route.route_id) ?? {weekday: [], weekend: []};
        departureTimesByRoute.set(route.route_id, {
            weekday: [...departures.weekday].sort((a, b) => a - b),
            weekend: [...departures.weekend].sort((a, b) => a - b),
        });
    });

    return departureTimesByRoute;
}
