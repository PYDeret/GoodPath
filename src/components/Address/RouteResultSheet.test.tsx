import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RouteResultSheet from "./RouteResultSheet.tsx";

describe('RouteResultSheet', () => {
    it('renders nothing when not visible', () => {
        const {container} = render(<RouteResultSheet visible={false}>content</RouteResultSheet>);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders children, expanded by default, when visible', () => {
        render(<RouteResultSheet visible={true}>route content</RouteResultSheet>);

        expect(screen.getByText('route content')).toBeInTheDocument();
        const contentWrapper = screen.getByText('route content').closest('[data-testid="route-result-sheet-content"]');
        expect(contentWrapper).toHaveClass('block');
    });

    it('collapses the content when the header is tapped, and expands it again on a second tap', async () => {
        render(<RouteResultSheet visible={true}>route content</RouteResultSheet>);

        const contentWrapper = screen.getByText('route content').closest('[data-testid="route-result-sheet-content"]');

        await userEvent.click(screen.getByRole('button', {name: 'Basculer le détail'}));
        expect(contentWrapper).toHaveClass('hidden');

        await userEvent.click(screen.getByRole('button', {name: 'Basculer le détail'}));
        expect(contentWrapper).toHaveClass('block');
    });

    it('always includes md:block on the content wrapper so desktop shows content regardless of collapse state', async () => {
        render(<RouteResultSheet visible={true}>route content</RouteResultSheet>);

        const contentWrapper = screen.getByText('route content').closest('[data-testid="route-result-sheet-content"]');
        expect(contentWrapper).toHaveClass('md:block');

        await userEvent.click(screen.getByRole('button', {name: 'Basculer le détail'}));
        expect(contentWrapper).toHaveClass('md:block');
    });
});
