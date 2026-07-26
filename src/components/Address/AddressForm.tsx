import {useState} from "react";
import type {FormEvent} from "react";
import AddressInput from "./AddressInput.tsx";
import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

export type AddressFormSubmitParams = {
    fromAddress: string,
    toAddress: string,
    departureDate?: Date,
    fromStationId?: string,
    toStationId?: string,
}

type Props = {
    onSubmit: (params: AddressFormSubmitParams) => void,
    stations?: Station[],
    linesByStation?: Map<string, Line[]>,
}

type FieldErrors = {
    from?: string,
    to?: string,
}

/**
 * Departure/arrival address inputs plus an optional departure time. Calls
 * `onSubmit` with the raw address strings, the chosen `Date` (or
 * `undefined` if the time field is left empty, meaning "now"), and each
 * field's confirmed station id if the user picked a station suggestion
 * (see `AddressInput`) rather than typing/picking a free-text address —
 * `undefined` if not, or if the field was edited again afterward.
 * Geocoding and routing happen upstream.
 */
function AddressForm({onSubmit, stations, linesByStation}: Props) {
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [departureTime, setDepartureTime] = useState('');
    const [fromStationId, setFromStationId] = useState<string>();
    const [toStationId, setToStationId] = useState<string>();
    const [errors, setErrors] = useState<FieldErrors>({});

    const handleFromChange = (value: string) => {
        setFromAddress(value);
        setFromStationId(undefined);
        if (value.trim()) {
            setErrors(current => ({...current, from: undefined}));
        }
    };

    const handleToChange = (value: string) => {
        setToAddress(value);
        setToStationId(undefined);
        if (value.trim()) {
            setErrors(current => ({...current, to: undefined}));
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const nextErrors: FieldErrors = {
            from: fromAddress.trim() ? undefined : 'Adresse de départ requise.',
            to: toAddress.trim() ? undefined : "Adresse d'arrivée requise.",
        };
        if (nextErrors.from || nextErrors.to) {
            setErrors(nextErrors);
            return;
        }

        onSubmit({
            fromAddress,
            toAddress,
            departureDate: departureTime ? new Date(departureTime) : undefined,
            fromStationId,
            toStationId,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
                <AddressInput
                    placeholder="Adresse de départ"
                    value={fromAddress}
                    onChange={handleFromChange}
                    stations={stations}
                    linesByStation={linesByStation}
                    onSelectStation={station => setFromStationId(station.id)}
                />
                {errors.from && <p className="mt-1 text-sm text-red-600">{errors.from}</p>}
            </div>
            <div>
                <AddressInput
                    placeholder="Adresse d'arrivée"
                    value={toAddress}
                    onChange={handleToChange}
                    stations={stations}
                    linesByStation={linesByStation}
                    onSelectStation={station => setToStationId(station.id)}
                />
                {errors.to && <p className="mt-1 text-sm text-red-600">{errors.to}</p>}
            </div>
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
