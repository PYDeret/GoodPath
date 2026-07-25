export type GraphEdge = {
    to: string,
    duration: number,
    routeId: string,
}

export type TransportGraph = Record<string, GraphEdge[]>
