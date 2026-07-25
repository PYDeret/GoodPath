import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

export type PathResult = {
    durations: Map<string, number>,
    previous: Map<string, string>,
}

export const computeShortestPaths = (graph: TransportGraph, fromStopId: string): PathResult => {
    const durations = new Map<string, number>([[fromStopId, 0]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const queue = new Set<string>([fromStopId]);

    while (queue.size > 0) {
        const current = [...queue].reduce((closest, stopId) =>
            (durations.get(stopId) ?? Infinity) < (durations.get(closest) ?? Infinity) ? stopId : closest
        );

        queue.delete(current);
        visited.add(current);

        for (const edge of graph[current] ?? []) {
            if (visited.has(edge.to)) {
                continue;
            }

            const duration = (durations.get(current) ?? Infinity) + edge.duration;
            if (duration < (durations.get(edge.to) ?? Infinity)) {
                durations.set(edge.to, duration);
                previous.set(edge.to, current);
                queue.add(edge.to);
            }
        }
    }

    return {durations, previous};
}

export const buildPath = (previous: Map<string, string>, toStopId: string): string[] => {
    const path = [toStopId];
    let current = toStopId;

    while (previous.has(current)) {
        current = previous.get(current)!;
        path.unshift(current);
    }

    return path;
}
