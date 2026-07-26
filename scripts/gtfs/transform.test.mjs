import {describe, expect, it} from "vitest";
import {buildData} from "./transform.mjs";

const routes = [
    {route_id: 'R1', route_short_name: '1', route_long_name: 'Line 1', route_color: 'FFFFFF', route_text_color: '000000', route_type: '1'},
];

const stops = [
    {stop_id: 'A', stop_name: 'Station A', stop_lat: '48.1', stop_lon: '2.1', zone_id: '1'},
    {stop_id: 'B', stop_name: 'Station B', stop_lat: '48.2', stop_lon: '2.2', zone_id: '1'},
    {stop_id: 'C', stop_name: 'Station C', stop_lat: '48.3', stop_lon: '2.3', zone_id: '1'},
];

const shapes = [
    {shape_id: 'S1', shape_pt_lat: '48.1', shape_pt_lon: '2.1', shape_pt_sequence: '2'},
    {shape_id: 'S1', shape_pt_lat: '48.0', shape_pt_lon: '2.0', shape_pt_sequence: '1'},
];

const trips = [
    {trip_id: 'T1', route_id: 'R1', shape_id: 'S1'},
    {trip_id: 'T2', route_id: 'R1', shape_id: 'S1'},
];

const calendar = [
    {service_id: 'S1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0'},
];

const tripsWithService = [
    {trip_id: 'T1', route_id: 'R1', shape_id: 'S1', service_id: 'S1'},
    {trip_id: 'T2', route_id: 'R1', shape_id: 'S1', service_id: 'S1'},
];

const stopTimes = [
    {trip_id: 'T1', stop_id: 'A', stop_sequence: '1', arrival_time: '10:00:00', departure_time: '10:00:00'},
    {trip_id: 'T1', stop_id: 'B', stop_sequence: '2', arrival_time: '10:05:00', departure_time: '10:05:00'},
    {trip_id: 'T2', stop_id: 'A', stop_sequence: '1', arrival_time: '11:00:00', departure_time: '11:00:00'},
    {trip_id: 'T2', stop_id: 'B', stop_sequence: '2', arrival_time: '11:03:00', departure_time: '11:03:00'},
];

describe('buildData', () => {
    it('maps routes to lines', () => {
        const data = buildData(routes, [], [], [], []);

        expect(data.lines).toEqual([
            {id: 'R1', shortName: '1', longName: 'Line 1', color: 'FFFFFF', textColor: '000000', type: 1, frequencies: {
                weekday: {peak: 20, offpeak: 20, night: 20},
                weekend: {peak: 20, offpeak: 20, night: 20},
            }},
        ]);
    });

    it('groups and sorts shape points by sequence', () => {
        const data = buildData([], shapes, [], [], []);

        expect(data.shapes.S1).toEqual([
            {shapeLat: 48.0, shapeLon: 2.0, shapeSequence: 1},
            {shapeLat: 48.1, shapeLon: 2.1, shapeSequence: 2},
        ]);
    });

    it('maps stops to stations', () => {
        const data = buildData([], [], stops, [], []);

        expect(data.stations[0]).toEqual({id: 'A', name: 'Station A', stopLat: 48.1, stopLon: 2.1, zoneId: '1'});
    });

    it('builds a graph edge between consecutive stops of a trip with its route id', () => {
        const data = buildData([], [], [], stopTimes, trips);

        expect(data.graph.A).toHaveLength(1);
        expect(data.graph.A[0]).toMatchObject({to: 'B', routeId: 'R1'});
    });

    it('keeps the shortest duration when several trips share the same stop pair', () => {
        const data = buildData([], [], [], stopTimes, trips);

        expect(data.graph.A[0].duration).toBe(180);
    });

    it('attaches computed frequencies to each line', () => {
        const stopTimesWithMorningTrips = [
            {trip_id: 'T1', stop_id: 'A', stop_sequence: '1', arrival_time: '08:00:00', departure_time: '08:00:00'},
            {trip_id: 'T1', stop_id: 'B', stop_sequence: '2', arrival_time: '08:05:00', departure_time: '08:05:00'},
            {trip_id: 'T2', stop_id: 'A', stop_sequence: '1', arrival_time: '08:30:00', departure_time: '08:30:00'},
            {trip_id: 'T2', stop_id: 'B', stop_sequence: '2', arrival_time: '08:33:00', departure_time: '08:33:00'},
        ];

        const data = buildData(routes, [], [], stopTimesWithMorningTrips, tripsWithService, [], calendar);

        expect(data.lines[0].frequencies).toEqual({
            weekday: {peak: 120, offpeak: 20, night: 20},
            weekend: {peak: 20, offpeak: 20, night: 20},
        });
    });

    it('adds a bidirectional interchange edge for each transfer', () => {
        const transfers = [{from_stop_id: 'B', to_stop_id: 'C', min_transfer_time: '90'}];

        const data = buildData([], [], [], [], [], transfers);

        expect(data.graph.B).toContainEqual({to: 'C', duration: 90, routeId: 'TRANSFER'});
        expect(data.graph.C).toContainEqual({to: 'B', duration: 90, routeId: 'TRANSFER'});
    });
});
