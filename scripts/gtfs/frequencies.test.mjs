// scripts/gtfs/frequencies.test.mjs
import {describe, expect, it} from "vitest";
import {computeLineFrequencies} from "./frequencies.mjs";

const routes = [{route_id: 'R1'}];

const weekdayCalendar = [
    {service_id: 'S1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0'},
];

const stopTimesByTrip = {
    T1: [{stop_sequence: '1', departure_time: '08:00:00'}],
    T2: [{stop_sequence: '1', departure_time: '08:30:00'}],
};

describe('computeLineFrequencies', () => {
    it('derives peak frequency from the number of trips starting in that bucket', () => {
        const trips = [
            {trip_id: 'T1', route_id: 'R1', service_id: 'S1'},
            {trip_id: 'T2', route_id: 'R1', service_id: 'S1'},
        ];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, stopTimesByTrip);

        // 2 trips in the 240 min/day peak window -> 240 / 2 = 120 min headway
        expect(frequencies.get('R1').weekday.peak).toBe(120);
    });

    it('falls back to the default 20-minute frequency for a bucket with no trips', () => {
        const trips = [{trip_id: 'T1', route_id: 'R1', service_id: 'S1'}];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, {T1: stopTimesByTrip.T1});

        expect(frequencies.get('R1').weekday.offpeak).toBe(20);
        expect(frequencies.get('R1').weekday.night).toBe(20);
    });

    it('only counts a trip toward the day types its service actually runs', () => {
        const trips = [{trip_id: 'T1', route_id: 'R1', service_id: 'S1'}];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, {T1: stopTimesByTrip.T1});

        expect(frequencies.get('R1').weekend.peak).toBe(20);
    });

    it('gives every route a frequencies entry, even with zero trips', () => {
        const frequencies = computeLineFrequencies(routes, [], [], {});

        expect(frequencies.get('R1')).toEqual({
            weekday: {peak: 20, offpeak: 20, night: 20},
            weekend: {peak: 20, offpeak: 20, night: 20},
        });
    });

    it('ignores a trip with no matching stop_times entry', () => {
        const trips = [{trip_id: 'TMissing', route_id: 'R1', service_id: 'S1'}];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, {});

        expect(frequencies.get('R1').weekday.peak).toBe(20);
    });

    it('dedupes trips that share a pattern and departure time within the same day type and bucket (weekly-sharded feed artifact)', () => {
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

        const frequencies = computeLineFrequencies(routes, trips, twoWeeksCalendar, dupStopTimesByTrip);

        // Same pattern + same departure time -> counted once -> 240min/1 = 240min headway, not 120.
        expect(frequencies.get('R1').weekday.peak).toBe(240);
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

        const frequencies = computeLineFrequencies(routes, trips, weekdayAndWeekendCalendar, sameTimeStopTimesByTrip);

        expect(frequencies.get('R1').weekday.peak).toBe(240);
        expect(frequencies.get('R1').weekend.peak).toBe(240);
    });
});
