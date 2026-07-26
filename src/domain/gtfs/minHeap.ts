type Entry<T> = {
    priority: number,
    value: T,
}

/**
 * Binary min-heap keyed by an explicit `priority` number, independent of
 * `value`'s type or identity — pushing the same value twice at different
 * priorities is allowed and expected (Dijkstra-style lazy deletion: the
 * caller pops repeatedly and discards stale entries for an already
 * finalized value using its own visited-set).
 */
export class MinHeap<T> {
    private entries: Entry<T>[] = [];

    get size(): number {
        return this.entries.length;
    }

    push(value: T, priority: number): void {
        this.entries.push({value, priority});
        let index = this.entries.length - 1;

        while (index > 0) {
            const parentIndex = (index - 1) >> 1;
            if (this.entries[parentIndex].priority <= this.entries[index].priority) {
                break;
            }
            [this.entries[parentIndex], this.entries[index]] = [this.entries[index], this.entries[parentIndex]];
            index = parentIndex;
        }
    }

    pop(): T | undefined {
        if (this.entries.length === 0) {
            return undefined;
        }

        const top = this.entries[0];
        const last = this.entries.pop()!;

        if (this.entries.length > 0) {
            this.entries[0] = last;
            let index = 0;

            for (;;) {
                const left = 2 * index + 1;
                const right = 2 * index + 2;
                let smallest = index;

                if (left < this.entries.length && this.entries[left].priority < this.entries[smallest].priority) {
                    smallest = left;
                }
                if (right < this.entries.length && this.entries[right].priority < this.entries[smallest].priority) {
                    smallest = right;
                }
                if (smallest === index) {
                    break;
                }

                [this.entries[smallest], this.entries[index]] = [this.entries[index], this.entries[smallest]];
                index = smallest;
            }
        }

        return top.value;
    }
}
