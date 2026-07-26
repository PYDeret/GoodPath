import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import SearchPanel from "./SearchPanel.tsx";

const renderSearchPanel = (onSubmit = vi.fn()) => {
    const queryClient = new QueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <SearchPanel onSubmit={onSubmit} />
        </QueryClientProvider>
    );
};

describe('SearchPanel', () => {
    it('renders AddressForm always mounted, and the mobile pill toggle collapsed by default', () => {
        renderSearchPanel();

        // AddressForm's own inputs are always in the DOM (never remounted).
        expect(screen.getByPlaceholderText('Adresse de départ')).toBeInTheDocument();
        // The mobile-only collapsed pill is visible by default (not yet expanded).
        expect(screen.getByRole('button', {name: 'Où allez-vous ?'})).toBeInTheDocument();
    });

    it('expands the form area and hides the pill when the pill is tapped', async () => {
        renderSearchPanel();

        await userEvent.click(screen.getByRole('button', {name: 'Où allez-vous ?'}));

        const formWrapper = screen.getByPlaceholderText('Adresse de départ').closest('[data-testid="search-panel-form"]');
        expect(formWrapper).not.toHaveClass('hidden');
        expect(formWrapper).toHaveClass('block');
    });

    it('collapses back and calls onSubmit when the wrapped form is submitted', async () => {
        const onSubmit = vi.fn();
        renderSearchPanel(onSubmit);

        await userEvent.click(screen.getByRole('button', {name: 'Où allez-vous ?'}));
        await userEvent.type(screen.getByPlaceholderText('Adresse de départ'), '1 rue de Paris');
        await userEvent.type(screen.getByPlaceholderText("Adresse d'arrivée"), '2 rue de Lyon');
        await userEvent.click(screen.getByText('Itinéraire'));

        expect(onSubmit).toHaveBeenCalledWith({
            fromAddress: '1 rue de Paris',
            toAddress: '2 rue de Lyon',
            departureDate: undefined,
            fromStationId: undefined,
            toStationId: undefined,
        });
        const formWrapper = screen.getByPlaceholderText('Adresse de départ').closest('[data-testid="search-panel-form"]');
        expect(formWrapper).toHaveClass('hidden');
    });
});
