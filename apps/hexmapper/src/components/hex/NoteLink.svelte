<script lang="ts">
  import { t } from '../../lib/i18n/index.svelte'
  import type { HexKey } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'
  import NoteRefInput from '../NoteRefInput.svelte'

  let { key, note, coord }: { key: HexKey; note: string; coord: string } = $props()
</script>

<div class="field">
  <span>{t('hex.note')}</span>
  <NoteRefInput
    value={note}
    label={t('hex.note')}
    placeholder={t('hex.notePlaceholder', { coord })}
    onchange={(value) => editor.editHex(key, (h) => ({ ...h, note: value }))}
  />
</div>
