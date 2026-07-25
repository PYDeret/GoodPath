import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import StationsLayer from "../Stations/StationsLayer.tsx";

function FullMap() {
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
                <StationsLayer />
            </MapContainer>
        </div>
    )
}

export default FullMap;