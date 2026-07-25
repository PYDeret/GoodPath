/**
 * Formats a duration in seconds as "1h23" (hours omitted below 60 minutes,
 * e.g. "42min").
 */
export const formatDuration = (durationInSeconds: number): string => {
    const totalMinutes = Math.round(durationInSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${minutes}min`;
}
