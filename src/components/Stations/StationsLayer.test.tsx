import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {CircleMarkerProps} from "react-leaflet";
import StationsLayer from "./StationsLayer.tsx";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";

vi.mock("../../hooks/gtfs/useGtfsData.ts");

vi.mock("react-leaflet", () => ({
    CircleMarker: ({center, pathOptions, eventHandlers}: CircleMarkerProps) => (
        <button
            data-testid="marker"
            data-center={(center as [number, number]).join(',')}
            data-color={pathOptions && 'color' in pathOptions ? pathOptions.color : 'default'}
            onClick={eventHandlers?.click}
        />
    ),
}));

const stations = [
    {id: 'A', name: 'Station A', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
    {id: 'B', name: 'Station B', stopLat: 48.2, stopLon: 2.2, zoneId: '1'},
];

describe('StationsLayer', () => {
    it('renders nothing while the GTFS data is not loaded', () => {
        vi.mocked(useGtfsData).mockReturnValue({data: undefined} as ReturnType<typeof useGtfsData>);

        const {container} = render(<StationsLayer onStationClick={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders one marker per station', () => {
        vi.mocked(useGtfsData).mockReturnValue({data: {stations}} as ReturnType<typeof useGtfsData>);

        render(<StationsLayer onStationClick={vi.fn()} />);

        expect(screen.getAllByTestId('marker')).toHaveLength(2);
    });

    it('highlights the selected departure and arrival stations', () => {
        vi.mocked(useGtfsData).mockReturnValue({data: {stations}} as ReturnType<typeof useGtfsData>);

        render(<StationsLayer onStationClick={vi.fn()} fromStopId="A" toStopId="B" />);

        const markers = screen.getAllByTestId('marker');
        expect(markers[0]).toHaveAttribute('data-color', 'red');
        expect(markers[1]).toHaveAttribute('data-color', 'red');
    });

    it('calls onStationClick with the clicked station id', async () => {
        vi.mocked(useGtfsData).mockReturnValue({data: {stations}} as ReturnType<typeof useGtfsData>);
        const onStationClick = vi.fn();

        render(<StationsLayer onStationClick={onStationClick} />);
        await userEvent.click(screen.getAllByTestId('marker')[0]);

        expect(onStationClick).toHaveBeenCalledWith('A');
    });
});
