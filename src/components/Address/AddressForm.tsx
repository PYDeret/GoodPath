import {useState} from "react";
import type {FormEvent} from "react";

type Props = {
    onSubmit: (fromAddress: string, toAddress: string) => void,
}

/**
 * Departure/arrival address inputs. Calls `onSubmit` with both raw address
 * strings on submit; geocoding and routing happen upstream.
 */
function AddressForm({onSubmit}: Props) {
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit(fromAddress, toAddress);
    };

    return (
        <form onSubmit={handleSubmit} className="address-form">
            <input
                type="text"
                placeholder="Adresse de départ"
                value={fromAddress}
                onChange={e => setFromAddress(e.target.value)}
            />
            <input
                type="text"
                placeholder="Adresse d'arrivée"
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
            />
            <button type="submit">Itinéraire</button>
        </form>
    );
}

export default AddressForm;
