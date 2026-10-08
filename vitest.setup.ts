// Node 25+ has a global localStorage; older ones (22, which CI tests too) don't. The apps'
// stores read it when they load, so tests get an in-memory one where it's missing.
if (typeof globalThis.localStorage === 'undefined') {
  const items = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return items.size
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
  }
  globalThis.localStorage = storage
}

// Node takes navigator.language from the system's locale, and the apps follow the browser's
// language: tests start in English on every machine.
if (typeof globalThis.navigator !== 'undefined') {
  Object.defineProperty(globalThis.navigator, 'language', { value: 'en-US', configurable: true })
  Object.defineProperty(globalThis.navigator, 'languages', {
    value: ['en-US', 'en'],
    configurable: true,
  })
}
