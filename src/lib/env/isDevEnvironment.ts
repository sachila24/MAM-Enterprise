/**
 * True only when the Vite dev server is running:
 *   - npm run dev
 *   - npm run electron:dev (loads http://localhost:5173)
 *
 * False for production renderer builds:
 *   - npm run electron (loads dist/)
 *   - packaged EXE (electron-builder)
 *
 * Uses Vite's compile-time `import.meta.env.DEV` flag — stripped to `false`
 * in production bundles, so dev controls are tree-shaken when possible.
 */
export function isDevEnvironment(): boolean {
  return typeof import.meta !== 'undefined' && import.meta.env.DEV === true;
}
