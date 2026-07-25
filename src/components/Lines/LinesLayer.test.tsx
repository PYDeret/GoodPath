import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import type {PolylineProps} from "react-leaflet";
import LinesLayer from "./LinesLayer.tsx";
import {useGtfsData} from "../../hooks/gtfs/useGtfsData.ts";

vi.mock("../../hooks/gtfs/useGtfsData.ts");

vi.mock("react-leaflet", () => ({
    Polyline: ({positions}: PolylineProps) => (
        <div data-testid="polyline" data-positions={JSON.stringify(positions)} />
    ),
}));

describe('LinesLayer', () => {
    it('renders nothing while the GTFS data is not loaded', () => {
        vi.mocked(useGtfsData).mockReturnValue({data: undefined} as ReturnType<typeof useGtfsData>);

        const {container} = render(<LinesLayer />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders one polyline per shape, with its points as [lat, lon] pairs', () => {
        vi.mocked(useGtfsData).mockReturnValue({
            data: {
                shapes: {
                    S1: [{shapeLat: 48.0, shapeLon: 2.0, shapeSequence: 1}, {shapeLat: 48.1, shapeLon: 2.1, shapeSequence: 2}],
                },
            },
        } as ReturnType<typeof useGtfsData>);

        render(<LinesLayer />);

        const polyline = screen.getByTestId('polyline');
        expect(JSON.parse(polyline.dataset.positions!)).toEqual([[48.0, 2.0], [48.1, 2.1]]);
    });
});
