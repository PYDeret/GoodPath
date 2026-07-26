import {describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {PropsWithChildren} from "react";
import {useAddressSuggestions} from "./useAddressSuggestions.ts";
import {searchAddresses} from "../../services/geo/geocodeAddress.ts";

vi.mock("../../services/geo/geocodeAddress.ts");

const wrapper = ({children}: PropsWithChildren) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useAddressSuggestions', () => {
    it('debounces the query before fetching suggestions', async () => {
        vi.mocked(searchAddresses).mockResolvedValue([{lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'}]);

        const {result} = renderHook(() => useAddressSuggestions('1 Rue'), {wrapper});

        expect(searchAddresses).not.toHaveBeenCalled();

        await waitFor(
            () => expect(result.current.data).toEqual([{lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'}]),
            {timeout: 1000},
        );
    });

    it('stays disabled while the query is under 3 characters', () => {
        vi.mocked(searchAddresses).mockClear();

        const {result} = renderHook(() => useAddressSuggestions('1'), {wrapper});

        expect(result.current.fetchStatus).toBe('idle');
        expect(searchAddresses).not.toHaveBeenCalled();
    });
});
