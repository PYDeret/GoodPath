import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import RouteInfoPanel from "./RouteInfoPanel.tsx";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

const data = {
    stations: [
        {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
        {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
    ],
    lines: [
        {id: 'L1', shortName: '1', longName: 'Line 1', color: 'FF0000', textColor: 'FFFFFF', type: 1},
    ],
} as GtfsData;

describe('RouteInfoPanel', () => {
    it('shows the total duration and each leg by line short name, stop names and its own duration', () => {
        render(<RouteInfoPanel data={data} duration={300} legs={[
            {routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 300},
        ]} />);

        expect(screen.getByText('Durée totale : 5min')).toBeInTheDocument();
        expect(screen.getByText('Ligne 1 : Station A → Station B (5min)')).toBeInTheDocument();
    });

    it('shows an interchange leg as "Changement à" instead of a line name, with its own duration', () => {
        render(<RouteInfoPanel data={data} duration={300} legs={[
            {routeId: 'TRANSFER', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 60},
        ]} />);

        expect(screen.getByText('Changement à Station B (1min)')).toBeInTheDocument();
    });
});
