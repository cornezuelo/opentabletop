/**
 * Imported first by every app's `main.ts`: brings this browser's data from older versions
 * up to date before any module reads it.
 */
import { renameOldKeys } from './renamed'

try {
  renameOldKeys(localStorage)
} catch {
  // No storage (private mode, blocked): nothing kept to rename.
}
