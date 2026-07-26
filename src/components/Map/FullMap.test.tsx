import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {PropsWithChildren} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import FullMap from "./FullMap.tsx";
import type StationsLayer from "../Stations/StationsLayer.tsx";

vi.mock("react-leaflet", () => ({
    MapContainer: ({children}: PropsWithChildren) => <div>{children}</div>,
    TileLayer: () => null,
    Marker: () => null,
}));

vi.mock("../Stations/StationsLayer.tsx", () => ({
    default: ({onStationClick, fromStopId, toStopId}: Parameters<typeof StationsLayer>[0]) => (
        <div>
            <span data-testid="from">{fromStopId ?? ''}</span>
            <span data-testid="to">{toStopId ?? ''}</span>
            <button onClick={() => onStationClick('A')}>select A</button>
            <button onClick={() => onStationClick('B')}>select B</button>
            <button onClick={() => onStationClick('C')}>select C</button>
        </div>
    ),
}));

vi.mock("../Path/PathLayer.tsx", () => ({default: () => null}));

const renderFullMap = () => {
    const queryClient = new QueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <FullMap />
        </QueryClientProvider>
    );
};

describe('FullMap station selection', () => {
    it('sets the first click as the departure station', async () => {
        renderFullMap();

        await userEvent.click(screen.getByText('select A'));

        expect(screen.getByTestId('from')).toHaveTextContent('A');
        expect(screen.getByTestId('to')).toHaveTextContent('');
    });

    it('sets the second click as the arrival station', async () => {
        renderFullMap();

        await userEvent.click(screen.getByText('select A'));
        await userEvent.click(screen.getByText('select B'));

        expect(screen.getByTestId('from')).toHaveTextContent('A');
        expect(screen.getByTestId('to')).toHaveTextContent('B');
    });

    it('starts a new selection on the third click', async () => {
        renderFullMap();

        await userEvent.click(screen.getByText('select A'));
        await userEvent.click(screen.getByText('select B'));
        await userEvent.click(screen.getByText('select C'));

        expect(screen.getByTestId('from')).toHaveTextContent('C');
        expect(screen.getByTestId('to')).toHaveTextContent('');
    });
});
