/* Safe views of browser globals so the page renderers can run at build time in Node. */
export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
export const matchMedia = isBrowser && window.matchMedia ? window.matchMedia.bind(window) : () => ({ matches: false, addEventListener() { }, removeEventListener() { } });
export const navigator = isBrowser ? window.navigator : { platform: '', userAgent: '', maxTouchPoints: 0 };
export const sessionStorage = isBrowser ? window.sessionStorage : { getItem() { return null; }, setItem() { }, removeItem() { } };
