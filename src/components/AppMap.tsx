import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function AppMap() {
    return (
        <div className="app-map">
            <MapContainer
                center={[48.85, 2.35]}
                zoom={13}
                scrollWheelZoom={false}
                className='app-map-container'
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
            </MapContainer>
        </div>
    )
}

export default AppMap