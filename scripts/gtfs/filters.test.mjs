import {describe, expect, it} from "vitest";
import {isKeptRoute, isKeptShape, isKeptStop, isKeptStopTime, isKeptTrip} from "./filters.mjs";

describe('isKeptRoute', () => {
    it.each(['0', '1', '2'])('keeps route_type %s', (route_type) => {
        expect(isKeptRoute({route_type})).toEqual({route_type});
    });

    it('rejects a route_type outside the allowed list', () => {
        expect(isKeptRoute({route_type: '3'})).toBeNull();
    });
});

describe('isKeptShape', () => {
    it('keeps a shape referenced by a trip', () => {
        const record = {shape_id: 'S1'};
        expect(isKeptShape(record, new Set(['S1']))).toBe(record);
    });

    it('rejects a shape referenced by no trip', () => {
        expect(isKeptShape({shape_id: 'S2'}, new Set(['S1']))).toBeNull();
    });
});

describe('isKeptStop', () => {
    it('keeps a stop referenced by a kept stop_time', () => {
        const record = {stop_id: 'A'};
        expect(isKeptStop(record, new Set(['A']))).toBe(record);
    });

    it('rejects a stop referenced by no kept stop_time', () => {
        expect(isKeptStop({stop_id: 'B'}, new Set(['A']))).toBeNull();
    });
});

describe('isKeptStopTime', () => {
    it('keeps a stop_time belonging to a kept trip', () => {
        const record = {trip_id: 'T1'};
        expect(isKeptStopTime(record, new Set(['T1']))).toBe(record);
    });

    it('rejects a stop_time belonging to no kept trip', () => {
        expect(isKeptStopTime({trip_id: 'T2'}, new Set(['T1']))).toBeNull();
    });
});

describe('isKeptTrip', () => {
    it('keeps a trip belonging to a kept route', () => {
        const record = {route_id: 'R1'};
        expect(isKeptTrip(record, new Set(['R1']))).toBe(record);
    });

    it('rejects a trip belonging to no kept route', () => {
        expect(isKeptTrip({route_id: 'R2'}, new Set(['R1']))).toBeNull();
    });
});
