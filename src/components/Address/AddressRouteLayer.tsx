import {useMemo} from "react";
import {Polyline} from "react-leaflet";
import type {PathLeg} from "../../domain/gtfs/pathLegs.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

type Props = {
    data: GtfsData,
    legs: PathLeg[],
}

// GTFS route_color is a bare hex string ("FF8800"); Leaflet needs a CSS color.
const formatLineColor = (color: string | undefined): string => color ? `#${color}` : 'blue';

/**
 * Draws the address-to-address route as one polyline per leg, colored by
 * the GTFS line color so each change of line is visible on the map.
 * Interchange legs (walking between platforms) are drawn as a dashed grey
 * line instead of a bogus line color.
 */
function AddressRouteLayer({data, legs}: Props) {
    const stationById = useMemo(() => new Map(data.stations.map(s => [s.id, s])), [data]);
    const lineById = useMemo(() => new Map(data.lines.map(l => [l.id, l])), [data]);

    return legs.map((leg, index) => {
        const positions = leg.stopIds
            .map(stopId => stationById.get(stopId))
            .filter(station => station !== undefined)
            .map(station => [station.stopLat, station.stopLon] as [number, number])
        ;

        return (
            <Polyline
                key={index}
                positions={positions}
                pathOptions={leg.isTransfer
                    ? {color: 'grey', weight: 4, dashArray: '6 6'}
                    : {color: formatLineColor(lineById.get(leg.routeId)?.color), weight: 6}}
            />
        );
    });
}

export default AddressRouteLayer;
