<script lang="ts">
  import { helpMarkdown, InfoTip, Markdown, SuggestInput, TagInput } from '@open-tabletop/ui-kit'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import { mapWorld, type HexKey, type MapConnection } from '@open-tabletop/map'
  import FieldEditor from './FieldEditor.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { editor } from '../lib/store/editor.svelte'
  import { ReplaceConnectionCommand } from '../lib/commands/connections'
  import { deleteSelectedConnection } from '../lib/tools/tools'
  import { mapSystem } from '../lib/play/systems'
  import { connectionsNow } from '../lib/play/connections'

  const coord = (hex: HexKey) => formatCoord(parseKey(hex), editor.grid.coordFormat, editor.grid)
  const connections = $derived.by(() => {
    void editor.revision
    return editor.map.connections
  })
  const selected = $derived(connections.find((c) => c.id === editor.selectedConnection))
  /** The kinds the map's system declares, then those the map already uses. */
  const kinds = $derived([
    ...new Set([
      ...Object.keys(mapSystem().rules.connections ?? {}),
      ...connections.map((c) => c.kind),
    ]),
  ])
  const tags = $derived([...new Set(connections.flatMap((c) => c.tags ?? []))])
  /** The selected one as the trip going on has it, if one is. */
  const inTrip = $derived.by(() => {
    void editor.revision
    void editor.map.play
    return selected && connectionsNow().get(selected.id)
  })
  /** Between far places, the km measured on the grid (what an empty Length means). */
  const measured = $derived.by(() => {
    if (!selected) return undefined
    const plain = { ...($state.snapshot(selected) as MapConnection), km: undefined }
    const world = mapWorld({ ...editor.map, connections: [plain] }, mapSystem().rules.travel.hexKm)
    const [a, b] = selected.between
    return world.far?.(a, b) ? world.km(a, b) : undefined
  })

  function update(change: (c: MapConnection) => MapConnection): void {
    if (!selected) return
    const after = change(structuredClone($state.snapshot(selected)) as MapConnection)
    editor.execute(new ReplaceConnectionCommand($state.snapshot(selected) as MapConnection, after))
  }
  const select = (id: string) => (editor.selectedConnection = id)
</script>

<div class="field">
  <span>{t('connection.kind')}<InfoTip text={t('connection.kindHelp')} /></span>
  <SuggestInput
    value={editor.connectionKind}
    list={kinds}
    label={t('connection.kind')}
    placeholder="bridge"
    onchange={(kind) => (editor.connectionKind = kind.trim())}
  />
</div>

{#if editor.connectionStart}
  <p class="status">{t('connection.drawing', { hex: coord(editor.connectionStart) })}</p>
{:else}
  <div class="help"><Markdown text={helpMarkdown(t('connection.help'))} /></div>
{/if}

{#if selected}
  <div class="selected">
    <p class="between">
      {coord(selected.between[0])} ↔ {coord(selected.between[1])}
    </p>
    <div class="field">
      <span>{t('connection.kind')}</span>
      <SuggestInput
        value={selected.kind}
        list={kinds}
        label={t('connection.kind')}
        onchange={(kind) => kind.trim() && update((c) => ({ ...c, kind: kind.trim() }))}
      />
    </div>
    {#if inTrip}
      <div class="trip">
        <span class="title"
          >{t('connection.inTrip')}<InfoTip text={t('connection.inTripHelp')} /></span
        >
        <span class:shut={!inTrip.open}
          >{inTrip.open ? t('connection.open') : t('connection.shut')}</span
        >
        {#each Object.entries(inTrip.changed) as [key, value] (key)}
          <span><code>{key}</code> = <code>{String(value)}</code></span>
        {/each}
      </div>
    {/if}
    <label class="field">
      <span>{t('connection.name')}</span>
      <input
        type="text"
        value={selected.name ?? ''}
        placeholder={t('connection.namePlaceholder')}
        onchange={(e) => {
          const name = e.currentTarget.value.trim()
          update((c) => ({ ...c, name: name || undefined }))
        }}
      />
    </label>
    {#if measured !== undefined}
      <label class="field">
        <span>{t('connection.km')}<InfoTip text={t('connection.kmHelp')} /></span>
        <input
          type="number"
          min="0"
          step="any"
          value={selected.km ?? ''}
          placeholder={String(Math.round(measured * 10) / 10)}
          onchange={(e) => {
            const km = Number(e.currentTarget.value)
            update((c) => ({ ...c, km: e.currentTarget.value && km > 0 ? km : undefined }))
          }}
        />
      </label>
    {/if}
    <div class="field">
      <span>{t('connection.tags')}<InfoTip text={t('connection.tagsHelp')} /></span>
      <TagInput
        label={t('connection.tags')}
        value={selected.tags ?? []}
        choices={tags}
        placeholder={t('connection.addTag')}
        removeLabel={t('connection.removeTag')}
        onchange={(next) =>
          update((c) => ({ ...c, tags: next.length ? [...new Set(next)] : undefined }))}
      />
    </div>
    <FieldEditor
      fields={selected.fields ?? []}
      help={t('connection.fieldsHelp')}
      scope="connection"
      onchange={(fields) => update((c) => ({ ...c, fields: fields.length ? fields : undefined }))}
    />
    <button class="danger" onclick={deleteSelectedConnection}>{t('connection.delete')}</button>
  </div>
{/if}

{#if connections.length}
  <h4>{t('connection.list', { count: connections.length })}</h4>
  <ul>
    {#each connections as c (c.id)}
      <li>
        <button class:active={c.id === editor.selectedConnection} onclick={() => select(c.id)}>
          <span class="name">{c.name ?? c.kind}</span>
          <span class="where">{coord(c.between[0])} ↔ {coord(c.between[1])}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field input {
    font: inherit;
    font-size: 13px;
    padding: 4px 6px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .selected {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--panel-border);
  }

  .trip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    padding: 6px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .trip .title {
    color: var(--text-muted);
  }

  .trip .shut {
    color: var(--danger, #b3261e);
  }

  .between,
  .status {
    margin: 0;
    font-size: 13px;
  }

  .help {
    font-size: 12px;
    color: var(--text-muted);
  }

  h4 {
    margin: 14px 0 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ul button {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 4px 6px;
    font-size: 12px;
    text-align: left;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  ul button:hover,
  ul button.active {
    border-color: var(--panel-border);
    background: var(--bg);
  }

  .where {
    color: var(--text-muted);
  }

  .danger {
    align-self: flex-start;
    padding: 5px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
</style>
