<script lang="ts">
  import { IconPicker, type IconCategory } from '@open-tabletop/ui-kit/icons'
  import { getLocale, t } from '../../lib/i18n/index.svelte'
  import { iconImages, importIcons, takeIcon } from '../../lib/io/icons.svelte'

  /**
   * ui-kit's icon picker with the map's own images and the library's icons (chosen as
   * `asset:<id>`), and a button to import one. With `none`, a first choice clears the icon.
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

  const images = $derived(iconImages())

  function choose(iconId: string | undefined) {
    takeIcon(iconId)
    onchange(iconId)
  }

  async function upload() {
    const [id] = await importIcons()
    if (id) onchange(id)
  }
</script>

<IconPicker
  {value}
  onchange={choose}
  {categories}
  {none}
  {images}
  locale={getLocale()}
  label={t('tokens.icon')}
  onupload={upload}
/>
