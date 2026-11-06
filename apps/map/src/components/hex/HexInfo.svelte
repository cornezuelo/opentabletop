<script lang="ts">
  import { tick } from 'svelte'
  import FieldEditor from '../FieldEditor.svelte'
  import NameDisplay from '../NameDisplay.svelte'
  import HexHere from './HexHere.svelte'
  import HexIcon from './HexIcon.svelte'
  import HexNotes from './HexNotes.svelte'
  import HexPaths from './HexPaths.svelte'
  import HexReadOnly from './HexReadOnly.svelte'
  import HexSubMaps from './HexSubMaps.svelte'
  import NoteLink from './NoteLink.svelte'
  import PoiList from './PoiList.svelte'
  import TagEditor from './TagEditor.svelte'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { t, type MessageKey } from '../../lib/i18n/index.svelte'
  import { deepLinkUrl } from '../../lib/io/deepLinkSync.svelte'
  import {
    collectSuggestions,
    regionChain,
    regionTree,
    type HexData,
    type HexKey,
  } from '@open-tabletop/map'
  import {
    appIconUrl,
    confirmAction,
    helpMarkdown,
    InfoTip,
    MoreMenu,
    tooltip,
    showToast,
  } from '@open-tabletop/ui-kit'
  import { editor } from '../../lib/store/editor.svelte'
  import { terrainName } from '../../lib/terrainName'

  /** In Play the cell is read: changing it is a step back to Edit. */
  const playing = $derived(editor.mode === 'play')

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

  /**
   * Values the hex gets from its regions (those it doesn't set itself), e.g. danger 2: from
   * the innermost that sets each, named after the regions they come from.
   */
  const inherited = $derived.by(() => {
    if (!selected) return null
    const { hex } = selected
    const chain = regionChain(editor.regions, hex.region)
    const seen = (hex.fields ?? []).map((f) => f.key)
    const fields: { key: string; value: string; from: string }[] = []
    for (const region of chain)
      for (const f of region.fields ?? [])
        if (f.key && !seen.includes(f.key)) {
          seen.push(f.key)
          fields.push({ key: f.key, value: f.value, from: region.name || '—' })
        }
    if (!fields.length) return null
    return {
      region: fields
        .map((f) => f.from)
        .filter((r, i, all) => all.indexOf(r) === i)
        .join(', '),
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

  /** What a cell may hold besides its name and region: shown once it has it, or is asked for. */
  type Part = 'notes' | 'note' | 'pois' | 'tags' | 'fields' | 'ways'
  const PARTS: { part: Part; label: MessageKey }[] = [
    { part: 'notes', label: 'hex.part.notes' },
    { part: 'note', label: 'hex.part.note' },
    { part: 'pois', label: 'hex.part.pois' },
    { part: 'tags', label: 'hex.part.tags' },
    { part: 'fields', label: 'hex.part.fields' },
    { part: 'ways', label: 'hex.part.ways' },
  ]
  /** The parts asked for on a cell; another cell starts with none. */
  let asked = $state<{ key?: HexKey; parts: Part[] }>({ parts: [] })
  const askedFor = (key: HexKey, part: Part) => asked.key === key && asked.parts.includes(part)
  function has(hex: HexData, part: Part): boolean {
    if (part === 'notes') return !!hex.notes
    if (part === 'note') return !!hex.note
    if (part === 'pois') return !!hex.pois?.length
    if (part === 'tags') return !!hex.tags?.length
    if (part === 'fields') return !!hex.fields?.length
    return false
  }
  const shown = (key: HexKey, hex: HexData, part: Part) => has(hex, part) || askedFor(key, part)

  let parts = $state<HTMLElement>()
  async function ask(key: HexKey, part: Part) {
    asked = { key, parts: [...(asked.key === key ? asked.parts : []), part] }
    await tick()
    // Straight to what was asked for.
    parts?.querySelector<HTMLElement>(`[data-part=${part}] :is(input, textarea, select)`)?.focus()
  }
</script>

{#if selected}
  {@const { key, hex } = selected}
  <div class="summary">
    <span class="coord">
      <span>{selected.coord}<InfoTip text={t('hex.idHelp', { id: key })} /></span>
    </span>
    <button
      class="roll-here"
      use:tooltip={{ markdown: helpMarkdown(t('oracle.rollHereHelp')) }}
      onclick={() => (editor.panelView = 'oracle')}
      ><img class="app" src={appIconUrl('oracle')} alt="" /> {t('oracle.rollHere')}</button
    >
    <MoreMenu label={t('hex.more')}>
      <button onclick={() => copyLink(selected.coord)}>{t('library.copyHexLink')}</button>
      {#if !playing}
        <button class="danger" onclick={() => clearHex(key)}>{t('hex.clear')}</button>
      {/if}
    </MoreMenu>
  </div>
  {#if selected.terrain}
    <span class="terrain">
      <span class="swatch" style:background={selected.terrain.color}></span>
      {terrainName(selected.terrain)}
      <code class="id" use:tooltip={t('hex.terrainIdTip')}>{selected.terrain.id}</code>
    </span>
  {:else}
    <span class="muted">{t('hex.none')}</span>
  {/if}

  {#key key}
    <HexHere {key} />
    {#if playing}
      <HexSubMaps {key} editing={false} />
      <HexReadOnly {hex} regions={regionChain(editor.regions, hex.region)} {inherited} />
    {:else}
      <HexSubMaps {key} name={hex.name ?? ''} editing={askedFor(key, 'ways')} />
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
          moved={!!hex.nameOffset}
          onplace={() => editor.editHex(key, (h) => ({ ...h, nameOffset: undefined }))}
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
            {#each regionTree(editor.regions) as { region, depth } (region.id)}
              <option value={region.id}>{'\u2003'.repeat(depth)}{region.name || '—'}</option>
            {/each}
          </select>
        </label>
      {/if}

      {#if hex.icon}
        <HexIcon {key} icon={hex.icon} />
      {/if}
      <div class="parts" bind:this={parts}>
        {#if shown(key, hex, 'notes')}
          <div data-part="notes">
            <HexNotes {key} notes={hex.notes ?? ''} editing={askedFor(key, 'notes')} />
          </div>
        {/if}
        {#if shown(key, hex, 'note')}
          <div data-part="note">
            <NoteLink {key} note={hex.note ?? ''} coord={selected.coord} />
          </div>
        {/if}
        {#if shown(key, hex, 'pois')}
          <div data-part="pois"><PoiList {key} pois={hex.pois ?? []} /></div>
        {/if}
        {#if shown(key, hex, 'tags')}
          <div data-part="tags">
            <TagEditor {key} tags={hex.tags ?? []} suggestions={suggestions.tags} />
          </div>
        {/if}
        {#if shown(key, hex, 'fields')}
          <div data-part="fields">
            <FieldEditor
              fields={hex.fields ?? []}
              help={t('fields.hexHelp')}
              onchange={(fields) => editor.editHex(key, (h) => ({ ...h, fields }))}
            />
          </div>
        {/if}
      </div>
      {#if inherited}
        <p class="inherited">{t('fields.fromRegion', inherited)}</p>
      {/if}
      <HexPaths {key} />
      <div class="add">
        {#each PARTS as { part, label } (part)}
          {#if !shown(key, hex, part)}
            <button onclick={() => ask(key, part)}>{t(label)}</button>
          {/if}
        {/each}
      </div>
    {/if}
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

  .parts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* What the cell doesn't hold yet, a click away. */
  .add {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .add button {
    padding: 3px 8px;
    font-size: 12px;
    color: var(--text-muted);
    background: transparent;
    border: 1px dashed var(--panel-border);
    border-radius: 12px;
    cursor: pointer;
  }

  .add button:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .id {
    font-size: 11px;
    color: var(--text-muted);
    user-select: all;
  }
</style>
