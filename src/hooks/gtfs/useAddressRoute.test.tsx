import {describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {useAddressRoute} from "./useAddressRoute.ts";
import {useGeocodedStation} from "../geo/useGeocodedStation.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

vi.mock("../geo/useGeocodedStation.ts");

const wrapper = ({children}: PropsWithChildren) => <>{children}</>;

const data: GtfsData = {
    graph: {A: [{to: 'B', duration: 300, routeId: 'L1'}]},
    shapes: {},
    stations: [
        {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
        {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
    ],
    lines: [],
};

describe('useAddressRoute', () => {
    it('geocodes both addresses, computes the path and groups it into legs', async () => {
        vi.mocked(useGeocodedStation).mockImplementation((_, address) => ({
            data: address === 'from' ? data.stations[0] : data.stations[1],
            isFetching: false,
        }) as ReturnType<typeof useGeocodedStation>);

        const {result} = renderHook(() => useAddressRoute(data, 'from', 'to'), {wrapper});

        await waitFor(() => expect(result.current.duration).toBe(300));
        expect(result.current.path).toEqual(['A', 'B']);
        expect(result.current.legs).toEqual([{routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B']}]);
    });

    it('has no path while a station is unresolved', () => {
        vi.mocked(useGeocodedStation).mockReturnValue({data: undefined, isFetching: true} as ReturnType<typeof useGeocodedStation>);

        const {result} = renderHook(() => useAddressRoute(data, 'from', 'to'), {wrapper});

        expect(result.current.path).toBeNull();
        expect(result.current.legs).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });
});
