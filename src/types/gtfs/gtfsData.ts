import type {Station} from "./gtfsStation.ts";
import type {Line} from "./gtfsLine.ts";

export type GtfsData = {
    stations: Station[],
    lines: Line[],
}