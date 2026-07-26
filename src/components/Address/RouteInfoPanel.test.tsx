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
    it('shows the total duration and each leg by line badge, stop names and its own duration', () => {
        render(<RouteInfoPanel data={data} duration={300} legs={[
            {routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 300, isTransfer: false},
        ]} />);

        expect(screen.getByText('Durée totale : 5min')).toBeInTheDocument();
        expect(screen.getByLabelText('Ligne 1')).toBeInTheDocument();
        expect(screen.getByText(/Station A → Station B \(5min\)/)).toBeInTheDocument();
    });

    it('shows an interchange leg as "Changement à" instead of a line badge, with its own duration', () => {
        render(<RouteInfoPanel data={data} duration={300} legs={[
            {routeId: 'TRANSFER', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 60, isTransfer: true},
        ]} />);

        expect(screen.getByText('Changement à Station B (1min)')).toBeInTheDocument();
    });

    it('falls back to the raw route id as plain text when the leg\'s line is not in data.lines', () => {
        render(<RouteInfoPanel data={data} duration={300} legs={[
            {routeId: 'UNKNOWN', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 300, isTransfer: false},
        ]} />);

        expect(screen.getByText(/UNKNOWN.*Station A → Station B \(5min\)/)).toBeInTheDocument();
    });
});
