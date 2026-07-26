import {useMemo} from "react";
import type {PathLeg} from "../../domain/gtfs/pathLegs.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";
import {formatDuration} from "../../domain/gtfs/formatDuration.ts";

type Props = {
    data: GtfsData,
    legs: PathLeg[],
    duration: number,
}

/**
 * Textual summary of an address-to-address route: total duration and the
 * ordered list of lines/stops to take, with interchange legs shown as
 * "Changement à X" rather than a bogus line name.
 */
function RouteInfoPanel({data, legs, duration}: Props) {
    const lineById = useMemo(() => new Map(data.lines.map(l => [l.id, l])), [data]);
    const stationById = useMemo(() => new Map(data.stations.map(s => [s.id, s])), [data]);

    return (
        <div className="route-info-panel">
            <p>Durée totale : {formatDuration(duration)}</p>
            <ol>
                {legs.map((leg, index) => (
                    <li key={index}>
                        {leg.isTransfer
                            ? `Changement à ${stationById.get(leg.toStopId)?.name} (${formatDuration(leg.duration)})`
                            : `Ligne ${lineById.get(leg.routeId)?.shortName ?? leg.routeId} : ${stationById.get(leg.fromStopId)?.name} → ${stationById.get(leg.toStopId)?.name} (${formatDuration(leg.duration)})`}
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default RouteInfoPanel;
