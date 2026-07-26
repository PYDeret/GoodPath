import {parseGtfsTime} from "./time.mjs";
import {timeBucketFor} from "./timeBuckets.mjs";

const BUCKET_DURATION_MINUTES = {peak: 240, offpeak: 660, night: 540};
// ponytail: buckets with no observed trip get a guessed 20-minute headway
// instead of making the line unreachable at that time; revisit if this
// proves inaccurate for sparsely-served lines.
const DEFAULT_FREQUENCY_MINUTES = 20;
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

const emptyCounts = () => ({
    weekday: {peak: 0, offpeak: 0, night: 0},
    weekend: {peak: 0, offpeak: 0, night: 0},
});

/**
 * Average line frequency (minutes between trains) per day type and
 * time-of-day bucket, derived from each trip's first stop_time as its
 * representative departure. See DEFAULT_FREQUENCY_MINUTES for the
 * sparse-bucket fallback.
 */
export const computeLineFrequencies = (routes, trips, calendar, stopTimesByTrip) => {
    const dayTypesByServiceId = new Map(calendar.map(row => [row.service_id, dayTypesForService(row)]));
    const tripCountsByRoute = new Map();

    trips.forEach(trip => {
        const points = stopTimesByTrip[trip.trip_id];
        if (!points || points.length === 0) {
            return;
        }

        const startSeconds = parseGtfsTime(points[0].departure_time);
        const bucket = timeBucketFor(startSeconds);
        const dayTypes = dayTypesByServiceId.get(trip.service_id) ?? [];

        if (!tripCountsByRoute.has(trip.route_id)) {
            tripCountsByRoute.set(trip.route_id, emptyCounts());
        }
        const counts = tripCountsByRoute.get(trip.route_id);

        dayTypes.forEach(dayType => {
            counts[dayType][bucket]++;
        });
    });

    const frequenciesByRoute = new Map();

    routes.forEach(route => {
        const counts = tripCountsByRoute.get(route.route_id);

        const frequenciesForDayType = (dayType) => ({
            peak: counts?.[dayType].peak ? BUCKET_DURATION_MINUTES.peak / counts[dayType].peak : DEFAULT_FREQUENCY_MINUTES,
            offpeak: counts?.[dayType].offpeak ? BUCKET_DURATION_MINUTES.offpeak / counts[dayType].offpeak : DEFAULT_FREQUENCY_MINUTES,
            night: counts?.[dayType].night ? BUCKET_DURATION_MINUTES.night / counts[dayType].night : DEFAULT_FREQUENCY_MINUTES,
        });

        frequenciesByRoute.set(route.route_id, {
            weekday: frequenciesForDayType('weekday'),
            weekend: frequenciesForDayType('weekend'),
        });
    });

    return frequenciesByRoute;
}
