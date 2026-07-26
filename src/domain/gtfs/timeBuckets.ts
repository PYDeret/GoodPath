// Kept in sync with scripts/gtfs/timeBuckets.mjs (checked by
// scripts/gtfs/timeBuckets.test.mjs).
export type TimeBucket = 'peak' | 'offpeak' | 'night';

export const PEAK_RANGES: [number, number][] = [[7 * 3600, 9 * 3600], [17 * 3600, 19 * 3600]];
export const NIGHT_START = 21 * 3600;
export const NIGHT_END = 6 * 3600;

export const timeBucketFor = (secondsOfDay: number): TimeBucket => {
    const t = ((secondsOfDay % 86400) + 86400) % 86400;

    if (PEAK_RANGES.some(([start, end]) => t >= start && t < end)) {
        return 'peak';
    }
    if (t >= NIGHT_START || t < NIGHT_END) {
        return 'night';
    }
    return 'offpeak';
}
