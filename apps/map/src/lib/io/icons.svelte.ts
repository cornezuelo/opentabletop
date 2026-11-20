/**
 * The pickers' side of Map's images (`mapIcons`): what they offer (the map's own and the
 * library's icons), a library icon taken into the map when it's chosen, and files imported
 * into both.
 */
import { libraryImages, showToast } from '@open-tabletop/ui-kit'
import { newId } from '@open-tabletop/map'
import { AddAssetCommand } from '../commands/assets'
import { t, type MessageKey } from '../i18n/index.svelte'
import { editor } from '../store/editor.svelte'
import { importImageFile, pickImageFiles } from './importImage'
import { assetToAdd, ICON_USE, iconChoices, keepMapIcons, type IconChoice } from './mapIcons'

/** The map's images, then the library's icons it hasn't got (read reactively). */
export function iconImages(): IconChoice[] {
  void editor.revision
  return iconChoices(editor.map.assets, libraryImages(ICON_USE))
}

/** Before an icon is used: one of the library's the map hasn't got is added to its images. */
export function takeIcon(iconId: string | undefined): void {
  const asset = assetToAdd(iconId, editor.map.assets, libraryImages(ICON_USE))
  if (asset) editor.execute(new AddAssetCommand(asset))
}

/**
 * Asks for image files and adds them to the map and to the library (one at most, unless
 * `many`); a file that can't be imported says why. Returns the icons' ids (`asset:<id>`).
 */
export async function importIcons(many = false): Promise<string[]> {
  const files = await pickImageFiles(many)
  const ids: string[] = []
  for (const file of files) {
    const result = await importImageFile(file)
    if ('error' in result) {
      showToast(`${file.name}: ${t(`icons.error.${result.error}` as MessageKey)}`, 'error')
      continue
    }
    const asset = { id: newId(), ...result }
    editor.execute(new AddAssetCommand(asset))
    void keepMapIcons([asset])
    ids.push(`asset:${asset.id}`)
  }
  return ids
}
