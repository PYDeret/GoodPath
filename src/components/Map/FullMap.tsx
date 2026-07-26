import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {useMemo, useState} from "react";
import SearchPanel from "../Address/SearchPanel.tsx";
import AddressRouteLayer from "../Address/AddressRouteLayer.tsx";
import AddressRouteMarkers from "../Address/AddressRouteMarkers.tsx";
import RouteInfoPanel from "../Address/RouteInfoPanel.tsx";
import RouteResultSheet from "../Address/RouteResultSheet.tsx";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {useAddressRoute} from "../../hooks/gtfs/useAddressRoute.ts";
import {computeRouteStatus} from "../../domain/gtfs/routeStatus.ts";
import {linesByStation} from "../../domain/gtfs/stationLines.ts";

const STATUS_MESSAGES = {
    loading: 'Recherche en cours...',
    'from-not-found': "Adresse de départ introuvable.",
    'to-not-found': "Adresse d'arrivée introuvable.",
    'no-path': "Aucun itinéraire trouvé entre ces deux adresses.",
};

/**
 * Root map view. Owns the address-based routing form and renders the
 * computed route on top of the tile layer. Layout is responsive:
 * `SearchPanel` and `RouteResultSheet` present as a fixed sidebar/inline
 * panel on desktop and as a floating collapsible pill/bottom sheet on
 * mobile (see their own docs) — the map itself is a single instance that
 * simply fills the remaining space in both cases.
 */
function FullMap() {
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [departureDate, setDepartureDate] = useState<Date>();
    const [fromStationId, setFromStationId] = useState<string>();
    const [toStationId, setToStationId] = useState<string>();

    const {data} = useGtfsData();
    const addressRoute = useAddressRoute(data, fromAddress, toAddress, departureDate, fromStationId, toStationId);
    const routeStatus = computeRouteStatus({
        fromAddress,
        toAddress,
        isLoading: addressRoute.isLoading,
        fromStation: addressRoute.fromStation,
        toStation: addressRoute.toStation,
        duration: addressRoute.duration,
    });

    const stationLinesMap = useMemo(
        () => data ? linesByStation(data.graph, data.lines) : new Map<string, never[]>(),
        [data]
    );

    const hasResult = (!!data && routeStatus === 'found' && addressRoute.duration !== null) || (routeStatus !== 'idle' && routeStatus !== 'found');

    return (
        <div className="relative flex h-svh w-full">
            <div className="contents md:flex md:h-full md:w-96 md:flex-shrink-0 md:flex-col md:overflow-y-auto md:border-r md:p-4">
                <SearchPanel
                    onSubmit={({fromAddress, toAddress, departureDate, fromStationId, toStationId}) => {
                        setFromAddress(fromAddress);
                        setToAddress(toAddress);
                        setDepartureDate(departureDate);
                        setFromStationId(fromStationId);
                        setToStationId(toStationId);
                    }}
                    stations={data?.stations}
                    linesByStation={stationLinesMap}
                />
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
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />
                    {data && routeStatus === 'found' && <AddressRouteLayer data={data} legs={addressRoute.legs} />}
                    <AddressRouteMarkers fromStation={addressRoute.fromStation ?? undefined} toStation={addressRoute.toStation ?? undefined} />
                </MapContainer>
            </div>
        </div>
    )
}

export default FullMap;
