import {useState} from "react";
import type {FormEvent} from "react";
import AddressInput from "./AddressInput.tsx";

type Props = {
    onSubmit: (fromAddress: string, toAddress: string, departureDate?: Date) => void,
}

/**
 * Departure/arrival address inputs plus an optional departure time. Calls
 * `onSubmit` with both raw address strings and the chosen `Date` (or
 * `undefined` if the time field is left empty, meaning "now") on submit;
 * geocoding and routing happen upstream.
 */
function AddressForm({onSubmit}: Props) {
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [departureTime, setDepartureTime] = useState('');

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit(fromAddress, toAddress, departureTime ? new Date(departureTime) : undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <AddressInput
                placeholder="Adresse de départ"
                value={fromAddress}
                onChange={setFromAddress}
            />
            <AddressInput
                placeholder="Adresse d'arrivée"
                value={toAddress}
                onChange={setToAddress}
            />
            <label className="flex flex-col gap-1 text-sm text-[var(--text)]">
                Heure de départ
                <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-[var(--text-h)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
                    style={{borderColor: 'var(--border)'}}
                />
            </label>
            <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
            >
                Itinéraire
            </button>
        </form>
    );
}

export default AddressForm;
