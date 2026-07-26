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
        <form onSubmit={handleSubmit} className="address-form">
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
            <label>
                Heure de départ
                <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                />
            </label>
            <button type="submit">Itinéraire</button>
        </form>
    );
}

export default AddressForm;
