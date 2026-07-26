import {afterEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {ReactElement} from "react";
import AddressForm from "./AddressForm.tsx";

function renderWithQueryClient(ui: ReactElement) {
    const queryClient = new QueryClient();
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('AddressForm', () => {
    it('submits the typed departure and arrival addresses with no departure date when the time field is left empty', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: () => Promise.resolve({features: []})}));
        const onSubmit = vi.fn();
        renderWithQueryClient(<AddressForm onSubmit={onSubmit} />);

        await userEvent.type(screen.getByPlaceholderText('Adresse de départ'), '1 rue de Paris');
        await userEvent.type(screen.getByPlaceholderText("Adresse d'arrivée"), '2 rue de Lyon');
        await userEvent.click(screen.getByText('Itinéraire'));

        expect(onSubmit).toHaveBeenCalledWith('1 rue de Paris', '2 rue de Lyon', undefined);
    });

    it('submits the chosen departure date when the time field is filled in', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: () => Promise.resolve({features: []})}));
        const onSubmit = vi.fn();
        renderWithQueryClient(<AddressForm onSubmit={onSubmit} />);

        await userEvent.type(screen.getByPlaceholderText('Adresse de départ'), '1 rue de Paris');
        await userEvent.type(screen.getByPlaceholderText("Adresse d'arrivée"), '2 rue de Lyon');
        await userEvent.type(screen.getByLabelText('Heure de départ'), '2026-07-26T14:30');
        await userEvent.click(screen.getByText('Itinéraire'));

        const [, , departureDate] = onSubmit.mock.calls[0];
        expect(departureDate).toEqual(new Date('2026-07-26T14:30:00'));
    });
});
