import {describe, expect, it} from "vitest";
import {computeRouteStatus} from "./routeStatus.ts";

const base = {fromAddress: 'A', toAddress: 'B', isLoading: false, fromStation: {}, toStation: {}, duration: 300};

describe('computeRouteStatus', () => {
    it('is idle before both addresses are submitted', () => {
        expect(computeRouteStatus({...base, toAddress: ''})).toBe('idle');
    });

    it('is loading while geocoding is in flight', () => {
        expect(computeRouteStatus({...base, isLoading: true})).toBe('loading');
    });

    it('flags an unresolved departure address', () => {
        expect(computeRouteStatus({...base, fromStation: null})).toBe('from-not-found');
    });

    it('flags an unresolved arrival address', () => {
        expect(computeRouteStatus({...base, toStation: null})).toBe('to-not-found');
    });

    it('flags stations with no path between them', () => {
        expect(computeRouteStatus({...base, duration: null})).toBe('no-path');
    });

    it('is found when a duration was computed', () => {
        expect(computeRouteStatus(base)).toBe('found');
    });
});
