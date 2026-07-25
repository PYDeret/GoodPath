import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {Polyline} from "react-leaflet";

function LinesLayer() {
    const {data} = useGtfsData();
    if (!data) {
        return null;
    }

    return Object.entries(data.shapes).map(([key, shape]) =>
        <Polyline positions={shape.map(s => [s.shapeLat, s.shapeLon])} key={key} />
    );
}

export default LinesLayer;