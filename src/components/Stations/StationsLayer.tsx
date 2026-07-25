import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {CircleMarker} from "react-leaflet";

function StationsLayer() {
    const {data} = useGtfsData();
    if (!data) {
        return null;
    }

    return data.stations.map(s =>
        <CircleMarker center={[s.stopLat, s.stopLon]} key={s.id} radius={4} />
    )
}

export default StationsLayer;