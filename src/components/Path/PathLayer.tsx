import {Polyline} from "react-leaflet";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {useShortestPath} from "../../hooks/gtfs/useShortestPath.ts";

type Props = {
    fromStopId?: string,
    toStopId?: string,
}

function PathLayer({fromStopId, toStopId}: Props) {
    const {data} = useGtfsData();
    const {path} = useShortestPath(data?.graph, fromStopId, toStopId);

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
