import {describe, expect, it} from "vitest";
import {formatDuration} from "./formatDuration.ts";

describe('formatDuration', () => {
    it('formats a sub-hour duration as minutes', () => {
        expect(formatDuration(42 * 60)).toBe('42min');
    });

    it('formats an hour-plus duration as hHmm', () => {
        expect(formatDuration(83 * 60)).toBe('1h23');
    });

    it('pads single-digit minutes', () => {
        expect(formatDuration(3600 + 5 * 60)).toBe('1h05');
    });

    it('rounds to the nearest minute', () => {
        expect(formatDuration(90)).toBe('2min');
    });

    it('formats zero as 0min', () => {
        expect(formatDuration(0)).toBe('0min');
    });
});
