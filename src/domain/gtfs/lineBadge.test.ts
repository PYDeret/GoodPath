import {describe, expect, it} from "vitest";
import {lineBadgeStyle} from "./lineBadge.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const lineOfType = (type: number): Line => ({
    id: 'L1', shortName: '1', longName: 'Line 1', color: 'FF0000', textColor: 'FFFFFF', type,
    frequencies: {
        weekday: {peak: 10, offpeak: 10, night: 10},
        weekend: {peak: 10, offpeak: 10, night: 10},
    },
});

describe('lineBadgeStyle', () => {
    it('maps route_type 1 (métro) to a circle', () => {
        expect(lineBadgeStyle(lineOfType(1)).shape).toBe('circle');
    });

    it('maps route_type 2 (rail/RER/Transilien) to a square', () => {
        expect(lineBadgeStyle(lineOfType(2)).shape).toBe('square');
    });

    it('maps route_type 0 (tram) to rounded', () => {
        expect(lineBadgeStyle(lineOfType(0)).shape).toBe('rounded');
    });

    it('maps route_type 3 (bus) to rounded', () => {
        expect(lineBadgeStyle(lineOfType(3)).shape).toBe('rounded');
    });

    it('defaults an unrecognized route_type to rounded', () => {
        expect(lineBadgeStyle(lineOfType(99)).shape).toBe('rounded');
    });

    it('prefixes the color fields with # and passes through the short name', () => {
        const style = lineBadgeStyle(lineOfType(1));

        expect(style.backgroundColor).toBe('#FF0000');
        expect(style.textColor).toBe('#FFFFFF');
        expect(style.label).toBe('1');
    });
});
