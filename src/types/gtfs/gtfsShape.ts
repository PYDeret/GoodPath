export type ShapePoint = {
    shapeLat: number,
    shapeLon: number,
    shapeSequence: number,
}

export type Shapes = Record<string, ShapePoint[]>
