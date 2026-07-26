import {lineBadgeStyle} from "../../domain/gtfs/lineBadge.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

type Props = {
    line: Line,
}

const BORDER_RADIUS_BY_SHAPE: Record<string, string> = {
    circle: '9999px',
    square: '4px',
    rounded: '8px',
};

/**
 * Small colored badge for a transit line, shaped like real RATP/IDFM
 * pictograms (circle/square/rounded per mode) using the line's own GTFS
 * color fields rather than a fetched logo image.
 */
function LineBadge({line}: Props) {
    const style = lineBadgeStyle(line);

    return (
        <span
            aria-label={`Ligne ${style.label}`}
            className="inline-flex h-6 w-6 items-center justify-center text-xs font-bold"
            style={{
                backgroundColor: style.backgroundColor,
                color: style.textColor,
                borderRadius: BORDER_RADIUS_BY_SHAPE[style.shape],
            }}
        >
            {style.label}
        </span>
    );
}

export default LineBadge;
