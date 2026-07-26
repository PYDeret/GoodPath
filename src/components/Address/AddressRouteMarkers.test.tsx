import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import AddressRouteMarkers from "./AddressRouteMarkers.tsx";
import type {Station} from "../../types/gtfs/gtfsStation.ts";

vi.mock("react-leaflet", () => ({
    Marker: ({position}: {position: [number, number]}) => (
        <div data-testid="marker" data-position={position.join(',')} />
    ),
}));

vi.mock("leaflet", () => ({
    default: {divIcon: () => ({})},
}));

const fromStation: Station = {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'};
const toStation: Station = {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'};

describe('AddressRouteMarkers', () => {
    it('renders no markers when neither station is set', () => {
        render(<AddressRouteMarkers />);

        expect(screen.queryAllByTestId('marker')).toHaveLength(0);
    });

    it('renders a marker for fromStation only when only it is set', () => {
        render(<AddressRouteMarkers fromStation={fromStation} />);

        expect(screen.getAllByTestId('marker')).toHaveLength(1);
        expect(screen.getByTestId('marker')).toHaveAttribute('data-position', '48,2');
    });

    it('renders both markers when both stations are set', () => {
        render(<AddressRouteMarkers fromStation={fromStation} toStation={toStation} />);

        expect(screen.getAllByTestId('marker')).toHaveLength(2);
    });
});
