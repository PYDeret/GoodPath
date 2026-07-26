import {Marker} from "react-leaflet";
import L from "leaflet";
import type {Station} from "../../types/gtfs/gtfsStation.ts";

type Props = {
    fromStation?: Station,
    toStation?: Station,
}

const flagIcon = (emoji: string) => L.divIcon({
    html: `<span style="font-size: 24px; line-height: 1;">${emoji}</span>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});

const DEPARTURE_ICON = flagIcon('🚩');
const ARRIVAL_ICON = flagIcon('🏁');

/**
 * Marks the geocoded departure/arrival stations of the address-search
 * route with a flag marker. Each renders as soon as its own station
 * resolves — independent of whether a full path was found, unlike
 * `AddressRouteLayer`'s polyline.
 */
function AddressRouteMarkers({fromStation, toStation}: Props) {
    return (
        <>
            {fromStation && <Marker position={[fromStation.stopLat, fromStation.stopLon]} icon={DEPARTURE_ICON} />}
            {toStation && <Marker position={[toStation.stopLat, toStation.stopLon]} icon={ARRIVAL_ICON} />}
        </>
    );
}

export default AddressRouteMarkers;
