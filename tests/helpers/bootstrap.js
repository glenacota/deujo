// tests/helpers/bootstrap.js
// The one place a unit test sets up its environment.
//
// App modules read `localStorage`, `window` and `document` while they are being
// imported, so the stubs have to exist first. A static import of the code under
// test cannot express that, because ESM hoists imports above statements, which
// is why test files still reach for `await import()` once this module has run.
import { installBrowserStub } from './browser-stub.js';
import { installDomStub } from './dom-stub.js';

// `browser` is the handle for `reset()` and `emit()`. Tests that only need the
// globals installed can ignore it.
export const browser = installBrowserStub();

// Additive, so installing it everywhere is safe: kata factories mount their
// markup while being imported, and a test that loads one needs createElement.
installDomStub();

// Pure config with no browser globals, so it can be re-exported statically
// rather than pulled in by every test through a dynamic import.
export { CONFIG } from '../../assets/js/config.js';
