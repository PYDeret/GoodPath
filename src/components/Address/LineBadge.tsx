import {useState} from "react";
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

const bareLineId = (id: string) => id.replace(/^IDFM:/, '');

/**
 * Small badge for a transit line: the official IDFM SVG pictogram fetched
 * by `npm run build:icons` (see scripts/icons/pipeline.mjs) when one exists
 * for this line, falling back to a colored CSS badge shaped like real
 * RATP/IDFM pictograms (circle/square/rounded per mode) using the line's
 * own GTFS color fields when no icon file is available.
 */
function LineBadge({line}: Props) {
    const [iconFailed, setIconFailed] = useState(false);
    const style = lineBadgeStyle(line);
    const accessibleName = `Ligne ${style.label}`;

    if (!iconFailed) {
        return (
            <img
                src={`/data/icons/${bareLineId(line.id)}.svg`}
                alt={accessibleName}
                aria-label={accessibleName}
                className="h-6 w-6"
                onError={() => setIconFailed(true)}
            />
        );
    }

    return (
        <span
            aria-label={accessibleName}
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
