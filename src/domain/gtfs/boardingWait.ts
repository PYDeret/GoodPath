import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {DayType} from "./dayType.ts";

const FALLBACK_WAIT_SECONDS = 600;
const SECONDS_PER_DAY = 86400;

const nextDepartureAfter = (sortedDepartures: number[], afterSeconds: number): number | undefined => {
    let low = 0;
    let high = sortedDepartures.length;

    while (low < high) {
        const mid = (low + high) >> 1;
        if (sortedDepartures[mid] < afterSeconds) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    return low < sortedDepartures.length ? sortedDepartures[low] : undefined;
}

/**
 * Estimated wait, in seconds, to board `line` at `dayType`/`clockSeconds`
 * (which may exceed one day for a multi-leg journey — only its
 * time-of-day phase matters): the time until the next real scheduled
 * departure at or after that phase. If every departure for the day has
 * already passed, wraps to the day's earliest departure plus 24h ("first
 * one tomorrow"). If the line has no departures at all for `dayType` (no
 * service that day), returns `Infinity` — Dijkstra's relaxation
 * naturally treats this edge as unusable, no special-casing needed there.
 * If `line` itself is unknown (routeId missing from the schedule),
 * returns a flat fallback wait: that's a data-lookup gap, not a real
 * "no service" fact.
 */
export const computeBoardingWaitSeconds = (line: Line | undefined, dayType: DayType, clockSeconds: number): number => {
    const departures = line?.departureTimes?.[dayType];
    if (!departures) {
        return FALLBACK_WAIT_SECONDS;
    }
    if (departures.length === 0) {
        return Infinity;
    }

    const timeOfDay = ((clockSeconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
    const next = nextDepartureAfter(departures, timeOfDay);

    return next !== undefined ? next - timeOfDay : (departures[0] + SECONDS_PER_DAY) - timeOfDay;
}
