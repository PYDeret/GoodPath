import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressInput from "./AddressInput.tsx";
import {useAddressSuggestions} from "../../hooks/geo/useAddressSuggestions.ts";

vi.mock("../../hooks/geo/useAddressSuggestions.ts");

describe('AddressInput', () => {
    it('shows suggestions on focus and fills the field on selection', async () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({
            data: [{lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'}],
        } as ReturnType<typeof useAddressSuggestions>);
        const onChange = vi.fn();
        render(<AddressInput placeholder="Adresse de départ" value="1 Rue" onChange={onChange} />);

        await userEvent.click(screen.getByPlaceholderText('Adresse de départ'));
        await userEvent.click(screen.getByText('1 Rue de Test, Paris'));

        expect(onChange).toHaveBeenCalledWith('1 Rue de Test, Paris');
    });

    it('closes the dropdown on outside click', async () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({
            data: [{lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'}],
        } as ReturnType<typeof useAddressSuggestions>);
        render(
            <div>
                <AddressInput placeholder="Adresse de départ" value="1 Rue" onChange={vi.fn()} />
                <button>outside</button>
            </div>,
        );

        await userEvent.click(screen.getByPlaceholderText('Adresse de départ'));
        expect(screen.getByText('1 Rue de Test, Paris')).toBeInTheDocument();

        await userEvent.click(screen.getByText('outside'));

        expect(screen.queryByText('1 Rue de Test, Paris')).not.toBeInTheDocument();
    });

    it('does not show a dropdown when there are no suggestions', () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({
            data: [],
        } as unknown as ReturnType<typeof useAddressSuggestions>);
        render(<AddressInput placeholder="Adresse de départ" value="" onChange={vi.fn()} />);

        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
});
