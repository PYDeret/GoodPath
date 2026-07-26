import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import type {PolylineProps} from "react-leaflet";
import PathLayer from "./PathLayer.tsx";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";
import {useShortestPath} from "../../hooks/gtfs/useShortestPath.ts";

vi.mock("../../hooks/gtfs/useGtfsData.ts");
vi.mock("../../hooks/gtfs/useShortestPath.ts");

vi.mock("react-leaflet", () => ({
    Polyline: ({positions}: PolylineProps) => (
        <div data-testid="polyline" data-positions={JSON.stringify(positions)} />
    ),
}));

const stations = [
    {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
    {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
];

describe('PathLayer', () => {
    it('renders nothing when the GTFS data is not loaded', () => {
        vi.mocked(useGtfsData).mockReturnValue({data: undefined} as ReturnType<typeof useGtfsData>);
        vi.mocked(useShortestPath).mockReturnValue({path: null, duration: null, arrivals: []});

        const {container} = render(<PathLayer />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when no path was found', () => {
        vi.mocked(useGtfsData).mockReturnValue({data: {stations}} as ReturnType<typeof useGtfsData>);
        vi.mocked(useShortestPath).mockReturnValue({path: null, duration: null, arrivals: []});

        const {container} = render(<PathLayer fromStopId="A" toStopId="B" />);

        expect(container).toBeEmptyDOMElement();
    });

    it('draws a polyline through the stations on the path, in order', () => {
        vi.mocked(useGtfsData).mockReturnValue({data: {stations}} as ReturnType<typeof useGtfsData>);
        vi.mocked(useShortestPath).mockReturnValue({path: ['A', 'B'], duration: 300, arrivals: [0, 300]});

        render(<PathLayer fromStopId="A" toStopId="B" />);

        const polyline = screen.getByTestId('polyline');
        expect(JSON.parse(polyline.dataset.positions!)).toEqual([[48.0, 2.0], [48.1, 2.1]]);
    });
});
