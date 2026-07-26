import {Polyline} from "react-leaflet";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {useShortestPath} from "../../hooks/gtfs/useShortestPath.ts";

type Props = {
    fromStopId?: string,
    toStopId?: string,
}

/**
 * Draws the shortest path (via `useShortestPath`) between `fromStopId` and
 * `toStopId` as a polyline through the corresponding station coordinates.
 * Renders nothing until both stops are set and a path exists.
 */
function PathLayer({fromStopId, toStopId}: Props) {
    const {data} = useGtfsData();
    const {path} = useShortestPath(data?.graph, fromStopId, toStopId, data?.lines);

    if (!data || !path) {
        return null;
    }

    const stationById = new Map(data.stations.map(s => [s.id, s]));
    const positions = path
        .map(stopId => stationById.get(stopId))
        .filter(station => station !== undefined)
        .map(station => [station.stopLat, station.stopLon] as [number, number]);

    return <Polyline positions={positions} pathOptions={{color: 'blue', weight: 5}} />;
}

export default PathLayer;
