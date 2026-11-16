<script lang="ts">
  import { showToast } from '@open-tabletop/ui-kit'
  import { IconPicker, type IconCategory } from '@open-tabletop/ui-kit/icons'
  import { AddAssetCommand } from '../../lib/commands/assets'
  import { getLocale, t, type MessageKey } from '../../lib/i18n/index.svelte'
  import { importImageFile, pickImageFiles } from '../../lib/io/importImage'
  import { newId } from '@open-tabletop/map'
  import { editor } from '../../lib/store/editor.svelte'

  /**
   * ui-kit's icon picker with the map's own images: those imported (chosen as `asset:<id>`)
   * and a button to import one. With `none`, a first choice clears the icon.
   */
  let {
    value,
    onchange,
    categories,
    none = false,
  }: {
    value: string | undefined
    onchange: (iconId: string | undefined) => void
    categories?: IconCategory[]
    none?: boolean
  } = $props()

  const images = $derived.by(() => {
    void editor.revision
    return editor.map.assets.map((a) => ({ id: a.id, name: a.name, url: a.dataUrl }))
  })

  async function upload() {
    const [file] = await pickImageFiles()
    if (!file) return
    const result = await importImageFile(file)
    if ('error' in result) {
      showToast(`${file.name}: ${t(`icons.error.${result.error}` as MessageKey)}`, 'error')
      return
    }
    const asset = { id: newId(), ...result }
    editor.execute(new AddAssetCommand(asset))
    onchange(`asset:${asset.id}`)
  }
</script>

<IconPicker
  {value}
  {onchange}
  {categories}
  {none}
  {images}
  locale={getLocale()}
  label={t('tokens.icon')}
  onupload={upload}
/>
