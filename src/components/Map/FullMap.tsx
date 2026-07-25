import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {useState} from "react";
import StationsLayer from "../Stations/StationsLayer.tsx";
import LinesLayer from "../Lines/LinesLayer.tsx";
import PathLayer from "../Path/PathLayer.tsx";

function FullMap() {
    const [fromStopId, setFromStopId] = useState<string>();
    const [toStopId, setToStopId] = useState<string>();

    const handleStationClick = (stopId: string) => {
        if (!fromStopId || toStopId) {
            setFromStopId(stopId);
            setToStopId(undefined);
        } else {
            setToStopId(stopId);
        }
    };

    return (
        <div className="app-map">
            <MapContainer
                center={[48.85, 2.35]}
                zoom={13}
                className='app-map-container'
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <StationsLayer onStationClick={handleStationClick} fromStopId={fromStopId} toStopId={toStopId} />
                <LinesLayer />
                <PathLayer fromStopId={fromStopId} toStopId={toStopId} />
            </MapContainer>
        </div>
    )
}

export default FullMap;