import {describe, expect, it} from "vitest";
import {computeLineDepartureTimes} from "./departureTimes.mjs";

const routes = [{route_id: 'R1'}];

const weekdayCalendar = [
    {service_id: 'S1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0'},
];

const stopTimesByTrip = {
    T1: [{stop_sequence: '1', departure_time: '08:00:00', stop_id: 'A'}],
    T2: [{stop_sequence: '1', departure_time: '08:30:00', stop_id: 'A'}],
};

describe('computeLineDepartureTimes', () => {
    it('collects each trip\'s departure time into the correct day type, sorted ascending', () => {
        const trips = [
            {trip_id: 'T2', route_id: 'R1', service_id: 'S1'},
            {trip_id: 'T1', route_id: 'R1', service_id: 'S1'},
        ];

        const departureTimes = computeLineDepartureTimes(routes, trips, weekdayCalendar, stopTimesByTrip);

        expect(departureTimes.get('R1').weekday).toEqual([8 * 3600, 8 * 3600 + 1800]);
    });

    it('only counts a trip toward the day types its service actually runs', () => {
        const trips = [{trip_id: 'T1', route_id: 'R1', service_id: 'S1'}];

        const departureTimes = computeLineDepartureTimes(routes, trips, weekdayCalendar, {T1: stopTimesByTrip.T1});

        expect(departureTimes.get('R1').weekend).toEqual([]);
    });

    it('gives every route empty departureTimes arrays, even with zero trips', () => {
        const departureTimes = computeLineDepartureTimes(routes, [], [], {});

        expect(departureTimes.get('R1')).toEqual({weekday: [], weekend: []});
    });

    it('ignores a trip with no matching stop_times entry', () => {
        const trips = [{trip_id: 'TMissing', route_id: 'R1', service_id: 'S1'}];

        const departureTimes = computeLineDepartureTimes(routes, trips, weekdayCalendar, {});

        expect(departureTimes.get('R1').weekday).toEqual([]);
    });

    it('dedupes trips that share a pattern and departure time within the same day type (weekly-sharded feed artifact)', () => {
        const dupStopTimesByTrip = {
            T1: [{stop_sequence: '1', departure_time: '08:00:00', stop_id: 'A'}],
            T2: [{stop_sequence: '1', departure_time: '08:00:00', stop_id: 'A'}],
        };
        const twoWeeksCalendar = [
            {service_id: 'Week1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0'},
            {service_id: 'Week2', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0'},
        ];
        const trips = [
            {trip_id: 'T1', route_id: 'R1', service_id: 'Week1'},
            {trip_id: 'T2', route_id: 'R1', service_id: 'Week2'},
        ];

        const departureTimes = computeLineDepartureTimes(routes, trips, twoWeeksCalendar, dupStopTimesByTrip);

        // Same pattern + same departure time -> counted once, not twice.
        expect(departureTimes.get('R1').weekday).toEqual([8 * 3600]);
    });

    it('does not dedupe trips with the same pattern and time across different day types', () => {
        const sameTimeStopTimesByTrip = {
            T1: [{stop_sequence: '1', departure_time: '08:00:00', stop_id: 'A'}],
            T2: [{stop_sequence: '1', departure_time: '08:00:00', stop_id: 'A'}],
        };
        const weekdayAndWeekendCalendar = [
            {service_id: 'Weekday', monday: '1', tuesday: '0', wednesday: '0', thursday: '0', friday: '0', saturday: '0', sunday: '0'},
            {service_id: 'Weekend', monday: '0', tuesday: '0', wednesday: '0', thursday: '0', friday: '0', saturday: '1', sunday: '0'},
        ];
        const trips = [
            {trip_id: 'T1', route_id: 'R1', service_id: 'Weekday'},
            {trip_id: 'T2', route_id: 'R1', service_id: 'Weekend'},
        ];

        const departureTimes = computeLineDepartureTimes(routes, trips, weekdayAndWeekendCalendar, sameTimeStopTimesByTrip);

        expect(departureTimes.get('R1').weekday).toEqual([8 * 3600]);
        expect(departureTimes.get('R1').weekend).toEqual([8 * 3600]);
    });

    it('normalizes a past-midnight GTFS time (e.g. 25:30:00) to its time-of-day value', () => {
        const trips = [{trip_id: 'T1', route_id: 'R1', service_id: 'S1'}];
        const lateStopTimesByTrip = {
            T1: [{stop_sequence: '1', departure_time: '25:30:00', stop_id: 'A'}],
        };

        const departureTimes = computeLineDepartureTimes(routes, trips, weekdayCalendar, lateStopTimesByTrip);

        // 25:30:00 = 91800s raw; normalized to time-of-day it's 1:30:00 = 5400s.
        expect(departureTimes.get('R1').weekday).toEqual([1 * 3600 + 1800]);
    });
});
