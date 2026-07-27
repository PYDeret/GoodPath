import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import LineBadge from "./LineBadge.tsx";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const line: Line = {
    id: 'L1', shortName: '14', longName: 'Line 14', color: '62259D', textColor: 'FFFFFF', type: 1,
    departureTimes: {weekday: [], weekend: []},
};

describe('LineBadge', () => {
    it('renders the line short name with its color and an accessible label', () => {
        render(<LineBadge line={line} />);

        const badge = screen.getByLabelText('Ligne 14');
        expect(badge).toHaveTextContent('14');
        expect(badge).toHaveStyle({backgroundColor: '#62259D', color: '#FFFFFF'});
    });
});
