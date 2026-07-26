import '@testing-library/jest-dom/vitest';
import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';

afterEach(cleanup);

// jsdom has no ResizeObserver; react-datepicker's time list needs one.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;
