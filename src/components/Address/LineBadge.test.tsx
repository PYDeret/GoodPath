import {describe, expect, it} from "vitest";
import {render, screen, fireEvent} from "@testing-library/react";
import LineBadge from "./LineBadge.tsx";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const line: Line = {
    id: 'IDFM:L1', shortName: '14', longName: 'Line 14', color: '62259D', textColor: 'FFFFFF', type: 1,
    departureTimes: {weekday: [], weekend: []},
};

describe('LineBadge', () => {
    it('renders the official icon image, stripping the IDFM: prefix from the src', () => {
        render(<LineBadge line={line} />);

        const img = screen.getByLabelText('Ligne 14');
        expect(img.tagName).toBe('IMG');
        expect(img).toHaveAttribute('src', '/data/icons/L1.svg');
    });

    it('falls back to the colored CSS badge when the icon fails to load', () => {
        render(<LineBadge line={line} />);

        fireEvent.error(screen.getByLabelText('Ligne 14'));

        const badge = screen.getByLabelText('Ligne 14');
        expect(badge.tagName).toBe('SPAN');
        expect(badge).toHaveTextContent('14');
        expect(badge).toHaveStyle({backgroundColor: '#62259D', color: '#FFFFFF'});
    });
});
