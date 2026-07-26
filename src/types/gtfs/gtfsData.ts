import type {Station} from "./gtfsStation.ts";
import type {Line} from "./gtfsLine.ts";
import type {TransportGraph} from "./gtfsGraph.ts";

export type GtfsData = {
    graph: TransportGraph;
    stations: Station[],
    lines: Line[],
}