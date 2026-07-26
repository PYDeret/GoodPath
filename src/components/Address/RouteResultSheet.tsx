import {useState} from "react";
import type {ReactNode} from "react";

type Props = {
    visible: boolean,
    children: ReactNode,
}

/**
 * Generic positioning/collapse wrapper for the route status message or
 * `RouteInfoPanel` — it doesn't know about routing, it just places
 * `children` and, on mobile, lets the user collapse it to a peek via a
 * tappable header. Renders nothing at all when `visible` is false
 * (mirrors the previous "render nothing while idle" behavior).
 * - Desktop (`md:` and up): inline in the sidebar column, always fully
 *   shown, no collapse behavior.
 * - Mobile: a floating bottom sheet, expanded by default; tapping the
 *   header toggles between full content and a collapsed peek.
 */
function RouteResultSheet({visible, children}: Props) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!visible) {
        return null;
    }

    return (
        <div className="fixed bottom-0 inset-x-0 z-[1100] rounded-t-lg border bg-[var(--bg)] p-3 shadow-lg md:static md:z-auto md:mt-4 md:rounded-lg md:p-0 md:shadow-none" style={{borderColor: 'var(--border)'}}>
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label="Basculer le détail"
                className="w-full text-left md:hidden"
            >
                ▲▼
            </button>
            <div data-testid="route-result-sheet-content" className={isExpanded ? 'block' : 'hidden'}>
                {children}
            </div>
        </div>
    );
}

export default RouteResultSheet;
