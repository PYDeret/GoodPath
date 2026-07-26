import {describe, expect, it} from "vitest";
import {dayTypeForDate} from "./dayType.ts";

describe('dayTypeForDate', () => {
    it('treats Saturday as weekend', () => {
        expect(dayTypeForDate(new Date('2026-07-25T12:00:00'))).toBe('weekend');
    });

    it('treats Sunday as weekend', () => {
        expect(dayTypeForDate(new Date('2026-07-26T12:00:00'))).toBe('weekend');
    });

    it('treats a Wednesday as weekday', () => {
        expect(dayTypeForDate(new Date('2026-07-22T12:00:00'))).toBe('weekday');
    });
});
