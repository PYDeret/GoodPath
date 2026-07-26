import {useEffect, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {searchAddresses} from "../../services/geo/geocodeAddress.ts";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

/**
 * Debounces `query` by 300ms then fetches address suggestions from the BAN
 * API. Disabled while the debounced query is under 3 characters, to avoid
 * firing on the first keystrokes.
 */
export function useAddressSuggestions(query: string) {
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
        return () => clearTimeout(timeout);
    }, [query]);

    return useQuery({
        queryKey: ['addressSuggestions', debouncedQuery],
        queryFn: () => searchAddresses(debouncedQuery),
        enabled: debouncedQuery.trim().length >= MIN_QUERY_LENGTH,
    });
}
