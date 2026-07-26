import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

export async function fetchGtfsData(): Promise<GtfsData> {
    const res = await fetch('/data/gtfs.json');

    return res.json();
}
