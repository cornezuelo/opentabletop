<script lang="ts">
  import FieldEditor from '../FieldEditor.svelte'
  import NameDisplay from '../NameDisplay.svelte'
  import LineIcon from '../LineIcon.svelte'
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
  import {
    appIconUrl,
    confirmAction,
    helpMarkdown,
    tooltip,
    showToast,
  } from '@open-tabletop/ui-kit'
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

  /** Values the hex gets from its region (those it doesn't set itself), e.g. danger 2. */
  const inherited = $derived.by(() => {
    if (!selected) return null
    const { hex } = selected
    const region = editor.regions.find((r) => r.id === hex.region)
    const own = new Set((hex.fields ?? []).map((f) => f.key))
    const fields = (region?.fields ?? []).filter((f) => f.key && !own.has(f.key))
    if (!region || !fields.length) return null
    return {
      region: region.name || '—',
      values: fields.map((f) => `${f.key} = ${f.value}`).join(', '),
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

  async function clearHex(key: HexKey) {
    if (await confirmAction(t('hex.confirmClear'))) editor.editHex(key, () => ({}))
  }
</script>

{#if selected}
  {@const { key, hex } = selected}
  <div class="summary">
    <span class="coord">
      {selected.coord}
      <code class="id" use:tooltip={t('hex.idTip')}>{key}</code>
      <button
        class="link"
        use:tooltip={t('library.copyHexLink')}
        aria-label={t('library.copyHexLink')}
        onclick={() => copyLink(selected.coord)}><LineIcon name="link" /></button
      >
    </span>
    <button
      class="roll-here"
      use:tooltip={{ markdown: helpMarkdown(t('oracle.rollHereHelp')) }}
      onclick={() => (editor.panelView = 'oracle')}
      ><img class="app" src={appIconUrl('oracle')} alt="" /> {t('oracle.rollHere')}</button
    >
    {#if selected.terrain}
      <span class="terrain">
        <span class="swatch" style:background={selected.terrain.color}></span>
        {terrainName(selected.terrain)}
        <code class="id" use:tooltip={t('hex.terrainIdTip')}>{selected.terrain.id}</code>
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
    {#if hex.name}
      <NameDisplay
        kind="hexNames"
        show={hex.showName !== false}
        style={hex.nameStyle}
        onshow={(show) =>
          editor.editHex(key, (h) => ({ ...h, showName: show ? undefined : false }))}
        onstyle={(nameStyle, live) => {
          editor.previewHex(key, (h) => ({ ...h, nameStyle }))
          if (!live) editor.commitHex(key)
        }}
      />
    {/if}

    {#if editor.regions.length}
      <label class="field">
        <span>{t('panel.regions')}</span>
        <select
          value={hex.region ?? ''}
          onchange={(e) => {
            const region = e.currentTarget.value || undefined
            editor.editHex(key, (h) => ({ ...h, region }))
          }}
        >
          <option value="">{t('regions.none')}</option>
          {#each editor.regions as region (region.id)}
            <option value={region.id}>{region.name || '—'}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if hex.icon}
      <HexIcon {key} icon={hex.icon} />
    {/if}
    <HexNotes {key} notes={hex.notes ?? ''} />
    <NoteLink {key} note={hex.note ?? ''} coord={selected.coord} />
    <PoiList {key} pois={hex.pois ?? []} />
    <TagEditor {key} tags={hex.tags ?? []} suggestions={suggestions.tags} />
    <FieldEditor
      fields={hex.fields ?? []}
      help={t('fields.hexHelp')}
      onchange={(fields) => editor.editHex(key, (h) => ({ ...h, fields }))}
    />
    {#if inherited}
      <p class="inherited">{t('fields.fromRegion', inherited)}</p>
    {/if}
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

  .roll-here {
    flex: none;
    padding: 3px 8px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .roll-here {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .roll-here .app {
    width: 14px;
    height: 14px;
  }

  .roll-here:hover {
    color: var(--accent);
    border-color: var(--accent);
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

  .inherited {
    font-size: 12px;
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

  .id {
    font-size: 11px;
    color: var(--text-muted);
    user-select: all;
  }
</style>
