import { SetSettingsCommand, type SettingsPatch } from '../commands/settings'
import { resolveSettingsPatch } from '../print/settings'
import { editor } from './editor.svelte'

/** Applies grid/print changes as one undoable step, refitting to paper when needed. */
export function applySettings(patch: SettingsPatch): void {
  const resolved = resolveSettingsPatch(editor.map, patch)
  if (resolved) editor.execute(new SetSettingsCommand(resolved))
}
