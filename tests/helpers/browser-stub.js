// tests/helpers/browser-stub.js
// Minimal browser globals so DOM-adjacent modules import in Node.
// Unit tests only need enough surface to import a module; anything that
// touches real rendering is left for the future end-to-end layer.

class MemoryStorage {
  #map = new Map();

  getItem(key) { return this.#map.has(key) ? this.#map.get(key) : null; }
  setItem(key, value) { this.#map.set(key, String(value)); }
  removeItem(key) { this.#map.delete(key); }
  clear() { this.#map.clear(); }
  get length() { return this.#map.size; }
}

/** Installs the stubs. Idempotent. Returns a handle to reset state between tests. */
export function installBrowserStub() {
  const listeners = new Map();

  const storage = new MemoryStorage();

  const target = {
    localStorage: storage,
    document: {
      visibilityState: 'visible',
      addEventListener(type, handler) {
        (listeners.get(type) ?? listeners.set(type, []).get(type)).push(handler);
      },
    },
    window: {
      addEventListener(type, handler) {
        (listeners.get(type) ?? listeners.set(type, []).get(type)).push(handler);
      },
    },
  };

  for (const [key, value] of Object.entries(target)) {
    if (globalThis[key] === undefined) globalThis[key] = value;
  }

  return {
    storage: globalThis.localStorage,
    /** Emits a DOM event to every stubbed listener. */
    emit(type) {
      for (const handler of listeners.get(type) ?? []) handler();
    },
    reset() {
      storage.clear();
    },
  };
}

/** A localStorage whose operations always throw, as in private mode. */
export function installThrowingStorage() {
  const boom = () => { throw new Error('QuotaExceededError'); };
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: boom, setItem: boom, removeItem: boom, clear: boom };
  return () => { globalThis.localStorage = original; };
}
