import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {useState} from "react";
import StationsLayer from "../Stations/StationsLayer.tsx";
import LinesLayer from "../Lines/LinesLayer.tsx";
import PathLayer from "../Path/PathLayer.tsx";
import AddressForm from "../Address/AddressForm.tsx";
import AddressRouteLayer from "../Address/AddressRouteLayer.tsx";
import RouteInfoPanel from "../Address/RouteInfoPanel.tsx";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {useAddressRoute} from "../../hooks/gtfs/useAddressRoute.ts";

/**
 * Root map view. Owns the departure/arrival station selection (click-based:
 * first click sets `fromStopId`, second sets `toStopId`, third resets) and
 * the address-based routing form. Renders the station, line, click-path and
 * address-route layers on top of the OSM tile layer, plus a route info
 * panel when an address route is found.
 */
function FullMap() {
    const [fromStopId, setFromStopId] = useState<string>();
    const [toStopId, setToStopId] = useState<string>();
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');

    const {data} = useGtfsData();
    const addressRoute = useAddressRoute(data, fromAddress, toAddress);

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
            <AddressForm onSubmit={(from, to) => { setFromAddress(from); setToAddress(to); }} />
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
                {data && addressRoute.legs.length > 0 && <AddressRouteLayer data={data} legs={addressRoute.legs} />}
            </MapContainer>
            {data && addressRoute.legs.length > 0 && addressRoute.duration !== null && (
                <RouteInfoPanel data={data} legs={addressRoute.legs} duration={addressRoute.duration} />
            )}
        </div>
    )
}

export default FullMap;