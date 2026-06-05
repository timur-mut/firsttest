// Global test setup. Adds jest-dom matchers (toBeInTheDocument, etc.) to
// Vitest's `expect`, cleans up the DOM between tests, and polyfills a couple of
// browser APIs jsdom lacks (ResizeObserver, matchMedia) that the planner uses.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom has no ResizeObserver (used by the Viewport to track its size).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
}

// jsdom has no matchMedia (used by the theme switcher).
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
