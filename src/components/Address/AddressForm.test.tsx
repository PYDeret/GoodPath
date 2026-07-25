import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressForm from "./AddressForm.tsx";

describe('AddressForm', () => {
    it('submits the typed departure and arrival addresses', async () => {
        const onSubmit = vi.fn();
        render(<AddressForm onSubmit={onSubmit} />);

        await userEvent.type(screen.getByPlaceholderText('Adresse de départ'), '1 rue de Paris');
        await userEvent.type(screen.getByPlaceholderText("Adresse d'arrivée"), '2 rue de Lyon');
        await userEvent.click(screen.getByText('Itinéraire'));

        expect(onSubmit).toHaveBeenCalledWith('1 rue de Paris', '2 rue de Lyon');
    });
});
