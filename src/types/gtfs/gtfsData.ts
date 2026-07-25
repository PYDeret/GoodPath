import type {Station} from "./gtfsStation.ts";
import type {Line} from "./gtfsLine.ts";
import type {Shapes} from "./gtfsShape.ts";

export type GtfsData = {
    shapes: Shapes;
    stations: Station[],
    lines: Line[],
}