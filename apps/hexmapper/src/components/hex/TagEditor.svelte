<script lang="ts">
  import { TagInput } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n/index.svelte'
  import type { HexKey } from '@open-tabletop/map'
  import { editor } from '../../lib/store/editor.svelte'

  /** A hex's tags as pills (ui-kit's `TagInput`), suggested from the packs and the map. */
  let { key, tags, suggestions }: { key: HexKey; tags: string[]; suggestions: string[] } = $props()
</script>

<div class="field">
  <span>{t('hex.tags')}</span>
  <TagInput
    label={t('hex.tags')}
    value={tags}
    choices={suggestions}
    placeholder={t('hex.addTag')}
    removeLabel={t('hex.remove')}
    onchange={(next) => editor.editHex(key, (h) => ({ ...h, tags: [...new Set(next)] }))}
  />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
