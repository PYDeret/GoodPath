import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {CircleMarker} from "react-leaflet";

type Props = {
    onStationClick: (stopId: string) => void,
    fromStopId?: string,
    toStopId?: string,
}

function StationsLayer({onStationClick, fromStopId, toStopId}: Props) {
    const {data} = useGtfsData();
    if (!data) {
        return null;
    }

    return data.stations.map(s =>
        <CircleMarker
            center={[s.stopLat, s.stopLon]}
            key={s.id}
            radius={4}
            pathOptions={s.id === fromStopId || s.id === toStopId ? {color: 'red'} : undefined}
            eventHandlers={{click: () => onStationClick(s.id)}}
        />
    );
}

export default StationsLayer;