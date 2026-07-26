import {useState} from "react";
import AddressForm from "./AddressForm.tsx";
import type {AddressFormSubmitParams} from "./AddressForm.tsx";
import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

type Props = {
    onSubmit: (params: AddressFormSubmitParams) => void,
    stations?: Station[],
    linesByStation?: Map<string, Line[]>,
}

/**
 * Wraps `AddressForm` in exactly one mounted instance, presented two ways
 * depending on viewport (CSS only, via the `md:` breakpoint — never by
 * remounting `AddressForm`, so in-progress input survives both a window
 * resize and toggling the mobile pill):
 * - Desktop (`md:` and up): a flex column stretched to fill its parent
 *   sidebar container (see `FullMap`, which owns the sidebar's width/
 *   border/padding), form always visible.
 * - Mobile: a floating pill ("Où allez-vous ?") that expands to the full
 *   form on tap; submitting collapses it back to the pill so the map and
 *   the new route are visible.
 */
function SearchPanel({onSubmit, stations, linesByStation}: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = (params: AddressFormSubmitParams) => {
        onSubmit(params);
        setIsExpanded(false);
    };

    return (
        <div className="fixed top-4 inset-x-4 z-[1100] md:static md:inset-auto md:z-auto md:flex md:flex-col">
            <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className={`${isExpanded ? 'hidden' : 'block'} w-full rounded-lg border bg-[var(--bg)] p-3 text-left shadow-lg md:hidden`}
                style={{borderColor: 'var(--border)'}}
            >
                Où allez-vous ?
            </button>
            <div
                data-testid="search-panel-form"
                className={`${isExpanded ? 'block' : 'hidden'} rounded-lg border bg-[var(--bg)] p-3 shadow-lg md:block md:border-none md:p-0 md:shadow-none`}
                style={{borderColor: 'var(--border)'}}
            >
                <AddressForm onSubmit={handleSubmit} stations={stations} linesByStation={linesByStation} />
            </div>
        </div>
    );
}

export default SearchPanel;
