import {describe, expect, it} from "vitest";
import {MinHeap} from "./minHeap.ts";

describe('MinHeap', () => {
    it('pops items in ascending priority order regardless of push order', () => {
        const heap = new MinHeap<string>();
        heap.push('c', 30);
        heap.push('a', 10);
        heap.push('b', 20);

        expect(heap.pop()).toBe('a');
        expect(heap.pop()).toBe('b');
        expect(heap.pop()).toBe('c');
    });

    it('returns undefined when popping an empty heap', () => {
        const heap = new MinHeap<string>();

        expect(heap.pop()).toBeUndefined();
    });

    it('handles duplicate priorities without losing either item', () => {
        const heap = new MinHeap<string>();
        heap.push('x', 5);
        heap.push('y', 5);

        const popped = [heap.pop(), heap.pop()];
        expect(popped.sort()).toEqual(['x', 'y']);
    });

    it('tracks size across pushes and pops', () => {
        const heap = new MinHeap<number>();
        expect(heap.size).toBe(0);

        heap.push(1, 1);
        heap.push(2, 2);
        expect(heap.size).toBe(2);

        heap.pop();
        expect(heap.size).toBe(1);
    });

    it('supports pushing the same value multiple times at different priorities (lazy deletion use case)', () => {
        const heap = new MinHeap<string>();
        heap.push('a', 10);
        heap.push('a', 5);

        expect(heap.pop()).toBe('a');
        expect(heap.size).toBe(1);
        expect(heap.pop()).toBe('a');
    });
});
