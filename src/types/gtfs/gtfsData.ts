import type {Station} from "./gtfsStation.ts";
import type {Line} from "./gtfsLine.ts";
import type {Shapes} from "./gtfsShape.ts";
import type {TransportGraph} from "./gtfsGraph.ts";

export type GtfsData = {
    graph: TransportGraph;
    shapes: Shapes;
    stations: Station[],
    lines: Line[],
}