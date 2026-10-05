<script lang="ts">
  import FieldList from './FieldList.svelte'
  import HexIcon from './HexIcon.svelte'
  import HexNotes from './HexNotes.svelte'
  import HexPaths from './HexPaths.svelte'
  import NoteLink from './NoteLink.svelte'
  import PoiList from './PoiList.svelte'
  import TagEditor from './TagEditor.svelte'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { t } from '../../lib/i18n/index.svelte'
  import { deepLinkUrl } from '../../lib/io/deepLinkSync.svelte'
  import { collectSuggestions } from '../../lib/model/hex'
  import { showToast } from '../../lib/store/toasts.svelte'
  import type { HexData, HexKey } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'
  import { terrainName } from '../../lib/terrainName'

  const selected = $derived.by(() => {
    void editor.revision
    const key = editor.selected
    if (!key) return null
    const hex: HexData = editor.map.hexes[key] ?? {}
    const terrain = editor.terrains.find((tt) => tt.id === hex.terrain)
    return {
      key,
      hex,
      coord: formatCoord(parseKey(key), editor.grid.coordFormat, editor.grid),
      terrain,
    }
  })

  const suggestions = $derived.by(() => {
    void editor.revision
    return collectSuggestions(Object.values(editor.map.hexes))
  })

  async function copyLink(coord: string) {
    try {
      await navigator.clipboard.writeText(deepLinkUrl(coord))
      showToast(t('library.hexLinkCopied'))
    } catch {
      // Clipboard unavailable (insecure context): the URL bar has the link too.
    }
  }

  function clearHex(key: HexKey) {
    if (confirm(t('hex.confirmClear'))) editor.editHex(key, () => ({}))
  }
</script>

{#if selected}
  {@const { key, hex } = selected}
  <div class="summary">
    <span class="coord">
      {selected.coord}
      <button
        class="link"
        title={t('library.copyHexLink')}
        aria-label={t('library.copyHexLink')}
        onclick={() => copyLink(selected.coord)}>🔗</button
      >
    </span>
    {#if selected.terrain}
      <span class="terrain">
        <span class="swatch" style:background={selected.terrain.color}></span>
        {terrainName(selected.terrain)}
      </span>
    {:else}
      <span class="muted">{t('hex.none')}</span>
    {/if}
  </div>

  {#key key}
    <label class="field">
      <span>{t('hex.name')}</span>
      <input
        type="text"
        value={hex.name ?? ''}
        placeholder={t('hex.namePlaceholder')}
        onchange={(e) => editor.editHex(key, (h) => ({ ...h, name: e.currentTarget.value }))}
      />
    </label>

    {#if hex.icon}
      <HexIcon {key} icon={hex.icon} />
    {/if}
    <HexNotes {key} notes={hex.notes ?? ''} />
    <NoteLink {key} note={hex.note ?? ''} coord={selected.coord} />
    <PoiList {key} pois={hex.pois ?? []} />
    <TagEditor {key} tags={hex.tags ?? []} suggestions={suggestions.tags} />
    <FieldList {key} fields={hex.fields ?? []} suggestions={suggestions.fieldKeys} />
    <HexPaths {key} />

    <button class="clear" onclick={() => clearHex(key)}>{t('hex.clear')}</button>
  {/key}
{:else}
  <p class="muted">{t('panel.noSelection')}</p>
{/if}

<style>
  .summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .coord {
    font-family: ui-monospace, monospace;
    font-size: 16px;
  }

  .terrain {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .muted,
  p {
    margin: 0;
    color: var(--text-muted);
  }

  .clear {
    align-self: flex-start;
    margin-top: 4px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .clear:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
</style>
