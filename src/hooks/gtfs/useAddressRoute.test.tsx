import {describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {useAddressRoute} from "./useAddressRoute.ts";
import {useGeocodedStation} from "../geo/useGeocodedStation.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

vi.mock("../geo/useGeocodedStation.ts");

const wrapper = ({children}: PropsWithChildren) => <>{children}</>;

const data: GtfsData = {
    graph: {A: [{to: 'B', duration: 300, routeId: 'L1', patternId: 'L1'}]},
    stations: [
        {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
        {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
    ],
    lines: [{
        id: 'L1', shortName: '1', longName: 'Line 1', color: 'FFF', textColor: '000', type: 1,
        departureTimes: {weekday: [8 * 3600 + 300], weekend: [8 * 3600 + 300]},
    }],
};

// Wednesday 08:00 boarding, next real departure at 8:05 -> 300s boarding wait.
const departureDate = new Date('2026-07-22T08:00:00');

describe('useAddressRoute', () => {
    it('geocodes both addresses, computes the schedule-aware path and groups it into legs', async () => {
        vi.mocked(useGeocodedStation).mockImplementation((_, address) => ({
            data: address === 'from' ? data.stations[0] : data.stations[1],
            isFetching: false,
        }) as ReturnType<typeof useGeocodedStation>);

        const {result} = renderHook(() => useAddressRoute(data, 'from', 'to', departureDate), {wrapper});

        await waitFor(() => expect(result.current.duration).toBe(300 + 300));
        expect(result.current.path).toEqual(['A', 'B']);
        expect(result.current.legs).toEqual([{routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 600, isTransfer: false}]);
    });

    it('has no path while a station is unresolved', () => {
        vi.mocked(useGeocodedStation).mockReturnValue({data: undefined, isFetching: true} as ReturnType<typeof useGeocodedStation>);

        const {result} = renderHook(() => useAddressRoute(data, 'from', 'to', departureDate), {wrapper});

        expect(result.current.path).toBeNull();
        expect(result.current.legs).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });

    it('resolves fromStation directly from data.stations when fromStationId is given, without geocoding that field', async () => {
        vi.mocked(useGeocodedStation).mockImplementation((_, address) => ({
            data: address === 'to' ? data.stations[1] : undefined,
            isFetching: false,
        }) as ReturnType<typeof useGeocodedStation>);

        const {result} = renderHook(() => useAddressRoute(data, 'ignored typed text', 'to', departureDate, 'A'), {wrapper});

        await waitFor(() => expect(result.current.duration).toBe(300 + 300));
        expect(result.current.fromStation).toEqual(data.stations[0]);
        // the "from" field's geocoding call used an empty address, since a direct station id was given
        expect(useGeocodedStation).toHaveBeenCalledWith(data.stations, '');
    });
});
