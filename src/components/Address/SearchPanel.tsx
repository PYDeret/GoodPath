import {useState} from "react";
import AddressForm from "./AddressForm.tsx";

type Props = {
    onSubmit: (fromAddress: string, toAddress: string, departureDate?: Date) => void,
}

/**
 * Wraps `AddressForm` in exactly one mounted instance, presented two ways
 * depending on viewport (CSS only, via the `md:` breakpoint — never by
 * remounting `AddressForm`, so in-progress input survives both a window
 * resize and toggling the mobile pill):
 * - Desktop (`md:` and up): a fixed-width sidebar, form always visible.
 * - Mobile: a floating pill ("Où allez-vous ?") that expands to the full
 *   form on tap; submitting collapses it back to the pill so the map and
 *   the new route are visible.
 */
function SearchPanel({onSubmit}: Props) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = (fromAddress: string, toAddress: string, departureDate?: Date) => {
        onSubmit(fromAddress, toAddress, departureDate);
        setIsExpanded(false);
    };

    return (
        <div className="fixed top-4 inset-x-4 z-[1100] md:static md:inset-auto md:z-auto md:flex md:h-full md:w-96 md:flex-shrink-0 md:flex-col md:border-r md:p-4">
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
                <AddressForm onSubmit={handleSubmit} />
            </div>
        </div>
    );
}

export default SearchPanel;
