<script lang="ts">
  import { manifestOf } from '@open-tabletop/pack-ui'
  import type { TravelSystem } from '@open-tabletop/session'
  import { appUrl, confirmAction, InfoTip, showToast } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { go, type Tab } from '../lib/nav.svelte'
  import {
    createPart,
    declareSystem,
    dependencies,
    partChoices,
    partName,
    systemRoot,
    type PartKind,
  } from '../lib/newSystem'
  import { mapPath, readMap, systemMaps } from '../lib/maps'
  import { library } from '../lib/packs.svelte'
  import { exportSystem, systemZipPacks } from '../lib/transfer'
  import { ROLLABLE, type SystemDoc } from '../lib/systemDoc.svelte'

  /**
   * A system at a glance, and its own definition (`kind: system`) as a form: its name and
   * description, the parts it uses (travel rules, bindings, calendar, weather models) and
   * the packs it brings. An older pack's implicit system can be declared from here.
   */
  let { system, doc }: { system: TravelSystem; doc: SystemDoc | null } = $props()

  type Raw = Record<string, unknown>
  const data = $derived<Raw | undefined>(doc?.system)
  const disabled = $derived(!doc?.editable)
  const root = $derived(systemRoot(system))
  const editableRoot = $derived(!!root && library.isEditable(root))
  const packName = (id: string) => {
    const pack = library.pack(library.rootOf(id) ?? '')
    return (pack && manifestOf(pack).name) || id
  }
  /** How many things a pack brings that can be rolled (tables, oracles, generators, decks). */
  const rollables = (pack: string) =>
    [...library.registry.definitions.values()].filter(
      (d) => d.pack === pack && (ROLLABLE as readonly string[]).includes(d.kind),
    ).length

  const deps = $derived(dependencies(system))
  const brought = $derived(Array.isArray(data?.packs) ? (data.packs as string[]) : [])
  const weather = $derived(Array.isArray(data?.weather) ? (data.weather as string[]) : [])

  /** The parts shown as selects, each with the key it's written under and its tab. */
  const PARTS: { key: string; kind: PartKind; tab?: Tab }[] = [
    { key: 'travel', kind: 'travel-rules', tab: 'rules' },
    { key: 'bindings', kind: 'bindings', tab: 'checks' },
    { key: 'calendar', kind: 'calendar' },
  ]

  const listed = $derived(Array.isArray(data?.maps) ? (data.maps as string[]) : [])
  const maps = $derived(systemMaps(system, listed))
  /** Opens the map in the Hexmapper, as its Maps → Example maps would. */
  const hexmapperLink = (path: string) =>
    `${appUrl('hexmapper')}#/example/${encodeURIComponent(system.pack ?? '')}/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`
  let picker = $state<HTMLInputElement>()

  /** A map file saved from the Hexmapper becomes a file of the pack, listed in `maps:`. */
  async function addMap(file: File) {
    if (!root || !doc) return
    const json = await file.text()
    const read = readMap(json)
    if ('error' in read) {
      showToast(t(`overview.mapError.${read.error as 'notJson'}`), 'error', 8000)
      return
    }
    const path = mapPath(file.name, (p) => library.readFile(root, p) !== undefined)
    library.batch(() => {
      library.writeFile(root, path, json)
      doc.edit('system', ['maps'], [...listed, path])
    })
  }

  async function removeMap(path: string, name: string) {
    if (!root || !doc || !(await confirmAction(t('overview.confirmRemoveMap', { name })))) return
    const next = listed.filter((p) => p !== path)
    library.batch(() => {
      doc.edit('system', ['maps'], next.length ? next : undefined)
      if (library.readFile(root, path) !== undefined) library.deleteFile(root, path)
    })
  }

  /** What its .zip would hold. */
  const zipped = $derived(system.pack ? systemZipPacks(system) : [])

  /** A part as the selects list it: its name and its id, or its id alone. */
  const choiceLabel = (kind: PartKind, id: string) => {
    const name = partName(system, kind, id)
    return name ? `${name} (${id})` : id
  }

  function setText(key: 'name' | 'description', text: string) {
    doc?.setText('system', [key], data?.[key], [key], text)
  }

  function toggle(key: 'weather' | 'packs', list: string[], id: string, on: boolean) {
    const next = on ? [...list, id] : list.filter((x) => x !== id)
    doc?.edit('system', [key], next.length ? next : undefined)
  }
</script>

<div class="overview">
  {#if system.id === 'generic'}
    <p class="help">{t('overview.generic')}</p>
  {:else if !data}
    <div class="notice">
      <span>{t('overview.implicit')}</span>
      {#if editableRoot}
        <button onclick={() => declareSystem(system)}>{t('overview.declare')}</button>
      {/if}
    </div>
  {:else if doc}
    <section class="texts">
      <label>
        <span>{t('overview.name')}<InfoTip text={t('overview.nameHelp')} /></span>
        <input
          type="text"
          value={doc.text('system', data.name, ['name'])}
          placeholder={doc.translating ? doc.baseText(data.name) : packName(system.pack ?? '')}
          {disabled}
          onchange={(e) => setText('name', e.currentTarget.value)}
        />
      </label>
      <label>
        <span>{t('overview.description')}<InfoTip text={t('overview.descriptionHelp')} /></span>
        <textarea
          rows="5"
          value={doc.text('system', data.description, ['description'])}
          placeholder={doc.translating ? doc.baseText(data.description) : ''}
          {disabled}
          onchange={(e) => setText('description', e.currentTarget.value)}></textarea>
      </label>
    </section>

    <section>
      <h3>{t('overview.parts')}<InfoTip text={t('overview.partsHelp')} /></h3>
      <div class="parts">
        {#each PARTS as part (part.key)}
          {@const choices = partChoices(system, part.kind)}
          {@const value = typeof data[part.key] === 'string' ? (data[part.key] as string) : ''}
          <label>
            <span
              >{t(`overview.${part.key as 'travel' | 'bindings' | 'calendar'}`)}<InfoTip
                text={t(`overview.${part.key as 'travel' | 'bindings' | 'calendar'}Help`)}
              /></span
            >
            <div class="row">
              <select
                {value}
                {disabled}
                onchange={(e) => doc.edit('system', [part.key], e.currentTarget.value || undefined)}
              >
                <option value=""
                  >{t(`overview.no.${part.key as 'travel' | 'bindings' | 'calendar'}`)}</option
                >
                {#each choices as id (id)}<option value={id}>{choiceLabel(part.kind, id)}</option
                  >{/each}
                {#if value && !choices.includes(value)}<option {value}>{value}</option>{/if}
              </select>
              {#if part.tab && value}
                <button
                  class="plain"
                  onclick={() => go({ name: 'system', id: system.id, tab: part.tab! })}
                  >{t('overview.open')}</button
                >
              {:else if !value && !disabled && (part.kind === 'travel-rules' || part.kind === 'bindings')}
                <button
                  class="plain"
                  onclick={() => createPart(system, part.kind as 'travel-rules' | 'bindings')}
                  >{t('overview.create')}</button
                >
              {/if}
            </div>
          </label>
        {/each}
      </div>
    </section>

    <section>
      <h3>{t('overview.weather')}<InfoTip text={t('overview.weatherHelp')} /></h3>
      {#each partChoices(system, 'weather') as id (id)}
        <label class="check">
          <input
            type="checkbox"
            checked={weather.includes(id)}
            {disabled}
            onchange={(e) => toggle('weather', weather, id, e.currentTarget.checked)}
          />
          {#if partName(system, 'weather', id)}{partName(system, 'weather', id)}{/if}
          <code>{id}</code>
        </label>
      {:else}
        <p class="help">{t('overview.noWeather')}</p>
      {/each}
    </section>

    <section>
      <h3>{t('overview.packs')}<InfoTip text={t('overview.packsHelp')} /></h3>
      <label class="check">
        <input type="checkbox" checked disabled />
        {packName(system.pack ?? '')}
        <span class="muted">{t('overview.ownPack', { count: rollables(system.pack ?? '') })}</span>
      </label>
      {#each deps as id (id)}
        <label class="check">
          <input
            type="checkbox"
            checked={brought.includes(id)}
            {disabled}
            onchange={(e) => toggle('packs', brought, id, e.currentTarget.checked)}
          />
          {packName(id)}
          <span class="muted">{t('overview.rollables', { count: rollables(id) })}</span>
        </label>
      {:else}
        <p class="help">{t('overview.noDependencies')}</p>
      {/each}
    </section>

    <section>
      <h3>{t('overview.maps')}<InfoTip text={t('overview.mapsHelp')} /></h3>
      {#each maps as map (map.path)}
        <div class="map">
          <span class="map-name">
            {#if map.name}{map.name}{:else}<span class="error"
                >{t(`overview.mapError.${map.error as 'missing'}`)}</span
              >{/if}
            <code>{map.path}</code>
          </span>
          {#if map.name}
            <a class="plain" href={hexmapperLink(map.path)}>{t('overview.openInHexmapper')}</a>
          {/if}
          {#if !disabled}
            <button class="plain" onclick={() => removeMap(map.path, map.name ?? map.path)}
              >{t('forms.remove')}</button
            >
          {/if}
        </div>
      {:else}
        <p class="help">{t('overview.noMaps')}</p>
      {/each}
      {#if !disabled}
        <div>
          <button class="plain" onclick={() => picker?.click()}>{t('overview.addMap')}</button>
          <input
            bind:this={picker}
            type="file"
            accept=".json,application/json"
            hidden
            onchange={(e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = ''
              if (file) addMap(file)
            }}
          />
        </div>
      {/if}
    </section>
  {/if}
  {#if zipped.length}
    <section>
      <h3>{t('overview.export')}<InfoTip text={t('overview.exportHelp')} /></h3>
      <p class="help">
        {t('overview.exportIncludes', {
          packs: zipped.map((p) => manifestOf(p).name ?? p.root).join(', '),
        })}
      </p>
      {#if zipped.some((p) => p.personal)}
        <p class="help personal">{t('overview.exportPersonal')}</p>
      {/if}
      <div>
        <button class="plain" onclick={() => exportSystem(system)}
          >{t('overview.exportButton')}</button
        >
      </div>
    </section>
  {/if}
</div>

<style>
  .overview {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 760px;
    padding-bottom: 24px;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  label.check {
    flex-direction: row;
    gap: 8px;
    align-items: center;
    font-size: 13px;
    color: var(--text);
  }

  .parts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }

  .row {
    display: flex;
    gap: 6px;
  }

  .row select {
    flex: 1;
    min-width: 0;
  }

  textarea {
    resize: vertical;
  }

  .muted {
    font-size: 12px;
    color: var(--text-muted);
  }

  .notice {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text-muted);
    border: 1px dashed var(--panel-border);
    border-radius: 6px;
  }

  .notice button {
    flex: none;
    padding: 5px 10px;
    color: var(--bg);
    background: var(--accent);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button.plain {
    padding: 4px 10px;
    font-size: 12px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .map {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
  }

  .map-name {
    display: flex;
    flex: 1;
    gap: 8px;
    align-items: baseline;
    min-width: 0;
  }

  .map-name code {
    overflow: hidden;
    font-size: 11px;
    color: var(--text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a.plain {
    padding: 4px 10px;
    font-size: 12px;
    color: var(--text);
    text-decoration: none;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .error {
    color: var(--danger, #e06c6c);
  }

  .help {
    margin: 0;
    color: var(--text-muted);
  }

  .help.personal {
    color: #d8c58a;
  }
</style>
