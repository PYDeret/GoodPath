import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressInput from "./AddressInput.tsx";
import {useAddressSuggestions} from "../../hooks/geo/useAddressSuggestions.ts";
import type {Station} from "../../types/gtfs/gtfsStation.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

vi.mock("../../hooks/geo/useAddressSuggestions.ts");

const lineC: Line = {
    id: 'L1', shortName: 'C', longName: 'RER C', color: 'FFCC30', textColor: '000000', type: 2,
    frequencies: {
        weekday: {peak: 10, offpeak: 10, night: 10},
        weekend: {peak: 10, offpeak: 10, night: 10},
    },
};

const etampesStation: Station = {id: 'S1', name: "Saint-Martin d'Étampes", stopLat: 0, stopLon: 0, zoneId: '1'};

describe('AddressInput', () => {
    it('shows suggestions on focus and fills the field on selection', async () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({
            data: [{lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'}],
        } as unknown as ReturnType<typeof useAddressSuggestions>);
        const onChange = vi.fn();
        render(<AddressInput placeholder="Adresse de départ" value="1 Rue" onChange={onChange} />);

        await userEvent.click(screen.getByPlaceholderText('Adresse de départ'));
        await userEvent.click(screen.getByText('1 Rue de Test, Paris'));

        expect(onChange).toHaveBeenCalledWith('1 Rue de Test, Paris');
    });

    it('closes the dropdown on outside click', async () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({
            data: [{lat: 48.85, lon: 2.35, label: '1 Rue de Test, Paris'}],
        } as unknown as ReturnType<typeof useAddressSuggestions>);
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

    it('shows matching station suggestions with their line badges ahead of address suggestions', async () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({
            data: [{lat: 48.85, lon: 2.35, label: 'Some BAN address'}],
        } as unknown as ReturnType<typeof useAddressSuggestions>);

        render(
            <AddressInput
                placeholder="Adresse de départ"
                value="etampes"
                onChange={vi.fn()}
                stations={[etampesStation]}
                linesByStation={new Map([['S1', [lineC]]])}
            />
        );

        await userEvent.click(screen.getByPlaceholderText('Adresse de départ'));

        expect(screen.getByText(/Saint-Martin d'Étampes/)).toBeInTheDocument();
        expect(screen.getByLabelText('Ligne C')).toBeInTheDocument();
        expect(screen.getByText('Some BAN address')).toBeInTheDocument();
    });

    it('calls onChange and onSelectStation when a station suggestion is clicked', async () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({data: []} as unknown as ReturnType<typeof useAddressSuggestions>);
        const onChange = vi.fn();
        const onSelectStation = vi.fn();

        render(
            <AddressInput
                placeholder="Adresse de départ"
                value="etampes"
                onChange={onChange}
                stations={[etampesStation]}
                onSelectStation={onSelectStation}
            />
        );

        await userEvent.click(screen.getByPlaceholderText('Adresse de départ'));
        await userEvent.click(screen.getByText(/Saint-Martin d'Étampes/));

        expect(onChange).toHaveBeenCalledWith("Saint-Martin d'Étampes");
        expect(onSelectStation).toHaveBeenCalledWith(etampesStation);
    });

    it('merges same-named stations into one suggestion with the union of their line badges', async () => {
        vi.mocked(useAddressSuggestions).mockReturnValue({data: []} as unknown as ReturnType<typeof useAddressSuggestions>);
        const lineTer: Line = {...lineC, id: 'L2', shortName: 'TER'};
        const stationA: Station = {id: 'A', name: 'Étampes', stopLat: 0, stopLon: 0, zoneId: '1'};
        const stationB: Station = {id: 'B', name: 'Étampes', stopLat: 0, stopLon: 0, zoneId: '1'};
        const onSelectStation = vi.fn();

        render(
            <AddressInput
                placeholder="Adresse de départ"
                value="etampes"
                onChange={vi.fn()}
                stations={[stationA, stationB]}
                linesByStation={new Map([['A', [lineC]], ['B', [lineC, lineTer]]])}
                onSelectStation={onSelectStation}
            />
        );

        await userEvent.click(screen.getByPlaceholderText('Adresse de départ'));

        expect(screen.getAllByText(/Étampes/)).toHaveLength(1);
        expect(screen.getByLabelText('Ligne C')).toBeInTheDocument();
        expect(screen.getByLabelText('Ligne TER')).toBeInTheDocument();

        await userEvent.click(screen.getByText(/Étampes/));

        expect(onSelectStation).toHaveBeenCalledWith(stationB);
    });
});
