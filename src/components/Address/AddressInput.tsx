import {useEffect, useMemo, useRef, useState} from "react";
import {useAddressSuggestions} from "../../hooks/geo/useAddressSuggestions.ts";
import {searchStations} from "../../domain/gtfs/searchStations.ts";
import {mergeDuplicateStations} from "../../domain/gtfs/mergeDuplicateStations.ts";
import LineBadge from "./LineBadge.tsx";
import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

type Props = {
    placeholder: string,
    value: string,
    onChange: (value: string) => void,
    stations?: Station[],
    linesByStation?: Map<string, Line[]>,
    onSelectStation?: (station: Station) => void,
}

const MAX_STATION_SUGGESTIONS = 3;
const MAX_TOTAL_SUGGESTIONS = 6;
// Generous: same-named duplicates (different GTFS stop-place granularities
// for one physical station) collapse into a single suggestion after
// merging, so we must search past MAX_STATION_SUGGESTIONS raw matches to
// still surface up to that many distinct station names.
const RAW_STATION_CANDIDATES = 15;

/**
 * Text input with a merged suggestion dropdown: up to 3 matching GTFS
 * stations (each with its serving lines' badges, deduplicated by station
 * name so a physical station split across several GTFS records shows as
 * one entry), ranked ahead of BAN address suggestions which fill the
 * remaining slots up to 6 total. Suggestions open on focus/typing and
 * close on selection, Escape, or a click outside the component. Clicking
 * a station suggestion calls both `onChange` (fills the field with its
 * name) and `onSelectStation` (signals a confirmed direct station pick,
 * skipping BAN geocoding for this field upstream) with the underlying
 * `Station` of the best-connected duplicate; clicking an address
 * suggestion only calls `onChange`, as before. `stations`/
 * `linesByStation`/`onSelectStation` are optional — omitting them keeps
 * the original address-only behavior.
 */
function AddressInput({placeholder, value, onChange, stations, linesByStation, onSelectStation}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const {data: addressSuggestions} = useAddressSuggestions(value);

    const stationSuggestions = useMemo(() => {
        if (!stations) {
            return [];
        }
        const matches = searchStations(stations, value, RAW_STATION_CANDIDATES);
        return mergeDuplicateStations(matches, linesByStation ?? new Map()).slice(0, MAX_STATION_SUGGESTIONS);
    }, [stations, value, linesByStation]);

    const remainingSlots = Math.max(0, MAX_TOTAL_SUGGESTIONS - stationSuggestions.length);
    const addressSuggestionsToShow = (addressSuggestions ?? []).slice(0, remainingSlots);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectAddress = (label: string) => {
        onChange(label);
        setIsOpen(false);
    };

    const handleSelectStation = (id: string, name: string) => {
        onChange(name);
        const station = stations?.find(s => s.id === id);
        if (station) {
            onSelectStation?.(station);
        }
        setIsOpen(false);
    };

    const hasSuggestions = stationSuggestions.length > 0 || addressSuggestionsToShow.length > 0;

    return (
        <div className="address-input" ref={containerRef}>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={e => {
                    if (e.key === 'Escape') {
                        setIsOpen(false);
                    }
                }}
                className="w-full rounded-lg border px-3 py-2 text-[var(--text-h)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-border)]"
                style={{borderColor: 'var(--border)'}}
            />
            {isOpen && hasSuggestions && (
                <ul className="address-input-suggestions">
                    {stationSuggestions.map(suggestion => (
                        <li
                            key={suggestion.id}
                            className="address-input-suggestion flex flex-col gap-1"
                            onClick={() => handleSelectStation(suggestion.id, suggestion.name)}
                        >
                            <span>🚉 {suggestion.name}</span>
                            <span className="flex gap-1">
                                {suggestion.lines.map(line => (
                                    <LineBadge key={line.id} line={line} />
                                ))}
                            </span>
                        </li>
                    ))}
                    {addressSuggestionsToShow.map(suggestion => (
                        <li
                            key={suggestion.label}
                            className="address-input-suggestion"
                            onClick={() => handleSelectAddress(suggestion.label)}
                        >
                            {suggestion.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default AddressInput;
