export type GraphEdge = {
    to: string,
    duration: number,
    routeId: string,
    patternId: string,
}

export type TransportGraph = Record<string, GraphEdge[]>
