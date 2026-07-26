import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {useState} from "react";
import StationsLayer from "../Stations/StationsLayer.tsx";
import LinesLayer from "../Lines/LinesLayer.tsx";
import PathLayer from "../Path/PathLayer.tsx";
import SearchPanel from "../Address/SearchPanel.tsx";
import AddressRouteLayer from "../Address/AddressRouteLayer.tsx";
import RouteInfoPanel from "../Address/RouteInfoPanel.tsx";
import RouteResultSheet from "../Address/RouteResultSheet.tsx";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {useAddressRoute} from "../../hooks/gtfs/useAddressRoute.ts";
import {computeRouteStatus} from "../../domain/gtfs/routeStatus.ts";

const STATUS_MESSAGES = {
    loading: 'Recherche en cours...',
    'from-not-found': "Adresse de départ introuvable.",
    'to-not-found': "Adresse d'arrivée introuvable.",
    'no-path': "Aucun itinéraire trouvé entre ces deux adresses.",
};

/**
 * Root map view. Owns the departure/arrival station selection (click-based:
 * first click sets `fromStopId`, second sets `toStopId`, third resets) and
 * the address-based routing form. Renders the station, line, click-path and
 * address-route layers on top of the OSM tile layer. Layout is responsive:
 * `SearchPanel` and `RouteResultSheet` present as a fixed sidebar/inline
 * panel on desktop and as a floating collapsible pill/bottom sheet on
 * mobile (see their own docs) — the map itself is a single instance that
 * simply fills the remaining space in both cases.
 */
function FullMap() {
    const [fromStopId, setFromStopId] = useState<string>();
    const [toStopId, setToStopId] = useState<string>();
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [departureDate, setDepartureDate] = useState<Date>();

    const {data} = useGtfsData();
    const addressRoute = useAddressRoute(data, fromAddress, toAddress, departureDate);
    const routeStatus = computeRouteStatus({
        fromAddress,
        toAddress,
        isLoading: addressRoute.isLoading,
        fromStation: addressRoute.fromStation,
        toStation: addressRoute.toStation,
        duration: addressRoute.duration,
    });

    const handleStationClick = (stopId: string) => {
        if (!fromStopId || toStopId) {
            setFromStopId(stopId);
            setToStopId(undefined);
        } else {
            setToStopId(stopId);
        }
    };

    const hasResult = (!!data && routeStatus === 'found' && addressRoute.duration !== null) || (routeStatus !== 'idle' && routeStatus !== 'found');

    return (
        <div className="relative flex h-svh w-full">
            <div className="contents md:flex md:h-full md:w-96 md:flex-shrink-0 md:flex-col md:overflow-y-auto md:border-r md:p-4">
                <SearchPanel onSubmit={(from, to, date) => { setFromAddress(from); setToAddress(to); setDepartureDate(date); }} />
                <RouteResultSheet visible={hasResult}>
                    {data && routeStatus === 'found' && addressRoute.duration !== null && (
                        <RouteInfoPanel data={data} legs={addressRoute.legs} duration={addressRoute.duration} />
                    )}
                    {routeStatus !== 'idle' && routeStatus !== 'found' && (
                        <p className="route-status">{STATUS_MESSAGES[routeStatus]}</p>
                    )}
                </RouteResultSheet>
            </div>
            <div className="relative flex-1">
                <MapContainer
                    center={[48.85, 2.35]}
                    zoom={13}
                    className="h-full w-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <StationsLayer onStationClick={handleStationClick} fromStopId={fromStopId} toStopId={toStopId} />
                    <LinesLayer />
                    <PathLayer fromStopId={fromStopId} toStopId={toStopId} />
                    {data && routeStatus === 'found' && <AddressRouteLayer data={data} legs={addressRoute.legs} />}
                </MapContainer>
            </div>
        </div>
    )
}

export default FullMap;
