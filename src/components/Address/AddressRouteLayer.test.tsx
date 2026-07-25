import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import type {PolylineProps} from "react-leaflet";
import AddressRouteLayer from "./AddressRouteLayer.tsx";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

vi.mock("react-leaflet", () => ({
    Polyline: ({positions, pathOptions}: PolylineProps) => (
        <div data-testid="polyline" data-positions={JSON.stringify(positions)} data-color={pathOptions?.color} />
    ),
}));

const data = {
    stations: [
        {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
        {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
        {id: 'C', name: 'Station C', stopLat: 48.2, stopLon: 2.2, zoneId: '1'},
    ],
    lines: [
        {id: 'L1', shortName: '1', longName: 'Line 1', color: 'FF0000', textColor: 'FFFFFF', type: 1},
    ],
} as GtfsData;

describe('AddressRouteLayer', () => {
    it('draws one polyline per leg, colored by the GTFS line color', () => {
        render(<AddressRouteLayer data={data} legs={[
            {routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B']},
            {routeId: 'L2', fromStopId: 'B', toStopId: 'C', stopIds: ['B', 'C']},
        ]} />);

        const polylines = screen.getAllByTestId('polyline');
        expect(polylines).toHaveLength(2);
        expect(polylines[0].dataset.color).toBe('#FF0000');
        expect(polylines[1].dataset.color).toBe('blue');
        expect(JSON.parse(polylines[0].dataset.positions!)).toEqual([[48.0, 2.0], [48.1, 2.1]]);
    });
});
