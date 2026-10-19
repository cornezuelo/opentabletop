/**
 * The local map library in IndexedDB: every map this browser has opened, keyed by map id.
 * Its contents are maps in the format of `@open-tabletop/map` (`json`, versioned); backups
 * copy the entries as they are. Every write is announced to the other windows and apps of
 * this browser (`onLibraryChange`), so one holding a map open can read it again.
 */
import { createLibrary, type LibraryChange, type LibraryEntry } from './library'

export type { LibraryChange, LibraryEntry }

/** The channel the library's changes go out on. */
export const LIBRARY_CHANNEL = 'opentabletop.maps'

const maps = createLibrary('library', LIBRARY_CHANNEL)

export const putLibraryMap = maps.put
export const getLibraryMap = maps.get
export const deleteLibraryMap = maps.delete
/** All maps, newest first, without their JSON (for listing). */
export const listLibrary = maps.list
/** Every map with its JSON (for backups). */
export const allLibraryMaps = maps.all
/** Writes several maps and deletes others in one transaction (restoring a backup). */
export const updateLibrary = maps.update
/**
 * Calls `listener` whenever another window or app of this browser changes the library
 * (never for this page's own writes). Returns a function that stops listening.
 */
export const onLibraryChange = maps.onChange
