export type RouteStatus = 'idle' | 'loading' | 'from-not-found' | 'to-not-found' | 'no-path' | 'found';

type Input = {
    fromAddress: string,
    toAddress: string,
    isLoading: boolean,
    fromStation: unknown,
    toStation: unknown,
    duration: number | null,
}

/**
 * Turns the raw state of `useAddressRoute` into a single status for display,
 * so a failed geocode or an unreachable destination shows a message instead
 * of the UI silently doing nothing.
 */
export const computeRouteStatus = ({fromAddress, toAddress, isLoading, fromStation, toStation, duration}: Input): RouteStatus => {
    if (!fromAddress || !toAddress) {
        return 'idle';
    }
    if (isLoading) {
        return 'loading';
    }
    if (!fromStation) {
        return 'from-not-found';
    }
    if (!toStation) {
        return 'to-not-found';
    }
    if (duration === null) {
        return 'no-path';
    }
    return 'found';
}
