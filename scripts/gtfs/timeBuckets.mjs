// Kept in sync with src/domain/gtfs/timeBuckets.ts (checked by timeBuckets.test.mjs).
export const PEAK_RANGES = [[7 * 3600, 9 * 3600], [17 * 3600, 19 * 3600]];
export const NIGHT_START = 21 * 3600;
export const NIGHT_END = 6 * 3600;

export const timeBucketFor = (secondsOfDay) => {
    const t = ((secondsOfDay % 86400) + 86400) % 86400;

    if (PEAK_RANGES.some(([start, end]) => t >= start && t < end)) {
        return 'peak';
    }
    if (t >= NIGHT_START || t < NIGHT_END) {
        return 'night';
    }
    return 'offpeak';
}
