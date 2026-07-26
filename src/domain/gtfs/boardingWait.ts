import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {DayType} from "./dayType.ts";
import {timeBucketFor} from "./timeBuckets.ts";

const FALLBACK_FREQUENCY_MINUTES = 20;

/**
 * Estimated wait, in seconds, to board `line` at `dayType`/`clockSeconds`
 * (half the average headway for that time-of-day bucket). `clockSeconds`
 * may exceed one day; `timeBucketFor` normalizes it.
 */
export const computeBoardingWaitSeconds = (line: Line | undefined, dayType: DayType, clockSeconds: number): number => {
    const bucket = timeBucketFor(clockSeconds);
    const frequencyMinutes = line?.frequencies?.[dayType]?.[bucket] ?? FALLBACK_FREQUENCY_MINUTES;
    return (frequencyMinutes * 60) / 2;
}
