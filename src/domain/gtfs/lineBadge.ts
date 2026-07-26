import type {Line} from "../../types/gtfs/gtfsLine.ts";

export type LineBadgeShape = 'circle' | 'square' | 'rounded';

export type LineBadgeStyle = {
    shape: LineBadgeShape,
    backgroundColor: string,
    textColor: string,
    label: string,
}

const SHAPE_BY_ROUTE_TYPE: Record<number, LineBadgeShape> = {
    0: 'rounded', // tram
    1: 'circle',  // métro
    2: 'square',  // rail (RER/Transilien)
};

/**
 * Visual style for a line's badge, mimicking the shape convention used by
 * real RATP/IDFM pictograms (circle = métro, square = RER/Transilien,
 * rounded = tram), using the line's own GTFS color fields rather than
 * fetching official logo images.
 */
export function lineBadgeStyle(line: Line): LineBadgeStyle {
    return {
        shape: SHAPE_BY_ROUTE_TYPE[line.type] ?? 'rounded',
        backgroundColor: `#${line.color}`,
        textColor: `#${line.textColor}`,
        label: line.shortName,
    };
}
