import {describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {PropsWithChildren} from "react";
import {useGeocodedStation} from "./useGeocodedStation.ts";
import {geocodeAddress} from "../../services/geo/geocodeAddress.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";

vi.mock("../../services/geo/geocodeAddress.ts");

const stations: Station[] = [
    {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
    {id: 'B', name: 'Station B', stopLat: 48.851, stopLon: 2.351, zoneId: '1'},
];

const wrapper = ({children}: PropsWithChildren) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useGeocodedStation', () => {
    it('resolves an address to its nearest station', async () => {
        vi.mocked(geocodeAddress).mockResolvedValue({lat: 48.85, lon: 2.35, label: 'somewhere'});

        const {result} = renderHook(() => useGeocodedStation(stations, 'somewhere'), {wrapper});

        await waitFor(() => expect(result.current.data).toEqual(stations[1]));
    });

    it('resolves to null when the address does not geocode', async () => {
        vi.mocked(geocodeAddress).mockResolvedValue(null);

        const {result} = renderHook(() => useGeocodedStation(stations, 'nowhere'), {wrapper});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('stays disabled while the address is empty', () => {
        vi.mocked(geocodeAddress).mockClear();

        const {result} = renderHook(() => useGeocodedStation(stations, ''), {wrapper});

        expect(result.current.fetchStatus).toBe('idle');
        expect(geocodeAddress).not.toHaveBeenCalled();
    });
});
