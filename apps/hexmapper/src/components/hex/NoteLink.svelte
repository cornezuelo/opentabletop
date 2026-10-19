<script lang="ts">
  import { getLocale, t } from '../../lib/i18n/index.svelte'
  import type { HexKey } from '@open-tabletop/map'
  import { editor } from '../../lib/store/editor.svelte'
  import { NoteRefInput } from '@open-tabletop/ui-kit'

  let { key, note, coord }: { key: HexKey; note: string; coord: string } = $props()
</script>

<div class="field">
  <span>{t('hex.note')}</span>
  <NoteRefInput
    locale={getLocale()}
    value={note}
    label={t('hex.note')}
    placeholder={t('hex.notePlaceholder', { coord })}
    onchange={(value) => editor.editHex(key, (h) => ({ ...h, note: value }))}
  />
</div>
