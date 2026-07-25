import {describe, expect, it} from "vitest";
import {formatDuration} from "./formatDuration.ts";

describe('formatDuration', () => {
    it('formats seconds under half a minute as 0min', () => {
        expect(formatDuration(20)).toBe('0min');
    });

    it('formats minutes only', () => {
        expect(formatDuration(42 * 60)).toBe('42min');
    });

    it('formats hours and minutes', () => {
        expect(formatDuration(65 * 60)).toBe('1h05');
    });

    it('formats exact hours with padded zero minutes', () => {
        expect(formatDuration(2 * 3600)).toBe('2h00');
    });

    it('rounds to the nearest minute', () => {
        expect(formatDuration(89)).toBe('1min');
    });
});
