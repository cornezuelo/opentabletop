<script lang="ts">
  import {
    ART_MODES,
    CAPTION_KINDS,
    CONNECTION_LINES,
    CONNECTION_SYMBOLS,
    LABEL_FONTS,
    PAINTERS,
    parseStyle,
    ROOF_KINDS,
    SCHEMATIC_STYLE,
    STYLED_PATHS,
    WALL_OUTSIDES,
    type CaptionKind,
    type MapStyle,
  } from '@open-tabletop/map'
  import { confirmAction, InfoTip, Markdown, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import CardHead from './CardHead.svelte'
  import type { DefinitionDoc } from './definitionDoc.svelte'
  import { translator } from './i18n'
  import type { Path } from './yaml'

  /**
   * A map style (`kind: style`) as forms: every part of it (paper and grid, ground, art by
   * terrain, shores, paths, floors, walls, connections' looks, names, regions) as a folded
   * card; a field left empty is the Schematic style's, shown as its placeholder. Where the
   * style is drawn (an open map) shows each change at once.
   */
  let {
    doc,
    locale,
    terrains = [],
    kinds = [],
  }: {
    doc: DefinitionDoc
    /** The UI language. */
    locale: string
    /** Terrain ids to suggest for the art. */
    terrains?: string[]
    /** Kinds of connection and way to suggest. */
    kinds?: string[]
  } = $props()

  const t = translator(() => locale)
  type Raw = Record<string, unknown>
  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const parsed = $derived(parseStyle({ ...data, kind: 'style', id: data.id || 'style' }))
  /** What the style comes to (Schematic's where it's broken), the placeholders' values. */
  const style: MapStyle = $derived(parsed.style ?? SCHEMATIC_STYLE)
  const base = SCHEMATIC_STYLE

  const get = (at: Path): unknown =>
    at.reduce<unknown>((node, key) => (node as Raw | undefined)?.[key], data)
  const set = (at: Path, value: unknown) => doc.edit('', at, value)
  const number = (raw: string) => {
    const value = raw.trim() === '' ? undefined : Number(raw)
    return value === undefined || Number.isFinite(value) ? value : undefined
  }
  /** An entry written short (`forest: conifers`) or long, as an object. */
  const entry = (value: unknown, key: string): Raw =>
    typeof value === 'string' ? { [key]: value } : ((value as Raw | undefined) ?? {})
  /** An entry back, short when it says its first key alone. */
  const shorten = (value: Raw, key: string): unknown => {
    const kept = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))
    return Object.keys(kept).length === 1 && key in kept ? kept[key] : kept
  }

  type Part =
    | 'sheet'
    | 'ground'
    | 'art'
    | 'shores'
    | 'paths'
    | 'floors'
    | 'walls'
    | 'roofs'
    | 'connections'
    | 'captions'
    | 'regions'
  let open = $state<Part[]>([])
  const toggle = (part: Part) =>
    (open = open.includes(part) ? open.filter((p) => p !== part) : [...open, part])

  const artTerrains = $derived(Object.entries((get(['art', 'terrains']) ?? {}) as Raw))
  const connections = $derived(Object.entries((get(['connections']) ?? {}) as Raw))
  let newTerrain = $state('')
  let newKind = $state('')
  const freeTerrains = $derived(terrains.filter((id) => !artTerrains.some(([k]) => k === id)))
  const freeKinds = $derived(kinds.filter((id) => !connections.some(([k]) => k === id)))

  function setArt(id: string, patch: Raw) {
    const current = entry(get(['art', 'terrains', id]), 'painter')
    set(['art', 'terrains', id], shorten({ ...current, ...patch }, 'painter'))
  }
  function addTerrain() {
    const id = newTerrain.trim()
    if (!id || artTerrains.some(([k]) => k === id)) return
    set(['art', 'terrains', id], 'grass')
    newTerrain = ''
  }
  function setLook(kind: string, patch: Raw) {
    const current = entry(get(['connections', kind]), 'symbol')
    set(['connections', kind], shorten({ ...current, ...patch }, 'symbol'))
  }
  function addKind() {
    const id = newKind.trim()
    if (!id || connections.some(([k]) => k === id)) return
    set(['connections', id], 'diamond')
    newKind = ''
  }
  async function removeEntry(at: Path, name: string) {
    if (await confirmAction(`${t('style.remove')}: ${name}?`)) set(at, undefined)
  }
  const fallback = (value: unknown) => t('style.fallback', { value: String(value) })
</script>

{#snippet numberField(label: string, help: string, at: Path, shown: number, max = 1, step = 0.05)}
  <label class="field">
    <span>{label}<InfoTip text={help} /></span>
    <input
      type="number"
      min="0"
      {max}
      {step}
      value={(get(at) as number | undefined) ?? ''}
      placeholder={String(shown)}
      {disabled}
      use:tooltip={fallback(shown)}
      onchange={(e) => set(at, number(e.currentTarget.value))}
    />
  </label>
{/snippet}

{#snippet colorField(label: string, help: string, at: Path, shown: string | undefined)}
  {@const own = get(at) as string | undefined}
  <label class="field">
    <span>{label}<InfoTip text={help} /></span>
    <span class="color">
      <input
        type="color"
        value={own ?? shown ?? '#000000'}
        {disabled}
        onchange={(e) => set(at, e.currentTarget.value)}
      />
      <code>{own ?? shown ?? t('style.automatic')}</code>
      {#if own !== undefined && !disabled}
        <button
          type="button"
          class="icon"
          aria-label={t('style.reset')}
          use:tooltip={t('style.reset')}
          onclick={() => set(at, undefined)}>×</button
        >
      {/if}
    </span>
  </label>
{/snippet}

{#snippet flagField(label: string, help: string, at: Path, shown: boolean)}
  <label class="field">
    <span
      >{label}{#if help}<InfoTip text={help} />{/if}</span
    >
    <input
      type="checkbox"
      checked={(get(at) as boolean | undefined) ?? shown}
      {disabled}
      onchange={(e) => set(at, e.currentTarget.checked)}
    />
  </label>
{/snippet}

{#snippet choiceField(
  label: string,
  help: string,
  at: Path,
  options: readonly string[],
  names: (o: string) => string,
  shown: string,
)}
  <label class="field">
    <span>{label}<InfoTip text={help} /></span>
    <select
      value={(get(at) as string | undefined) ?? shown}
      {disabled}
      onchange={(e) => set(at, e.currentTarget.value)}
    >
      {#each options as o (o)}<option value={o}>{names(o)}</option>{/each}
    </select>
  </label>
{/snippet}

{#snippet card(part: Part, body: import('svelte').Snippet)}
  <div class="card">
    <CardHead
      title={t(`style.${part}.title`)}
      id={part === 'sheet' ? 'paper · grid · glyphs' : part}
      said={t(`style.${part}.said`)}
      open={open.includes(part)}
      ontoggle={() => toggle(part)}
      {locale}
    />
    {#if open.includes(part)}<div class="body">{@render body()}</div>{/if}
  </div>
{/snippet}

<div class="style-form">
  {#if parsed.errors.length}
    <div class="problems" role="alert">
      <p>{t('style.invalid')}</p>
      <ul>
        {#each parsed.errors as e (e)}<li><code>{e}</code></li>{/each}
      </ul>
    </div>
  {/if}

  <div class="fields">
    <label class="field">
      <span>{t('style.name')}<InfoTip text={t('style.nameHelp')} /></span>
      <input
        type="text"
        value={doc.text('', data.name, ['name'])}
        placeholder={doc.translating ? doc.baseText(data.name) : ''}
        {disabled}
        onchange={(e) => doc.setText('', ['name'], data.name, ['name'], e.currentTarget.value)}
      />
    </label>
    <label class="field">
      <span>{t('style.description')}<InfoTip text={t('style.descriptionHelp')} /></span>
      <textarea
        rows="3"
        value={doc.text('', data.description, ['description'])}
        placeholder={doc.translating ? doc.baseText(data.description) : ''}
        {disabled}
        onchange={(e) =>
          doc.setText(
            '',
            ['description'],
            data.description,
            ['description'],
            e.currentTarget.value,
          )}></textarea>
    </label>
  </div>

  {#snippet sheet()}
    <div class="fields">
      {@render colorField(t('style.paper'), t('style.paperHelp'), ['paper'], style.paper)}
      {@render colorField(
        t('style.gridColor'),
        t('style.gridColorHelp'),
        ['grid', 'color'],
        style.grid.color,
      )}
      {@render numberField(
        t('style.gridOpacity'),
        t('style.gridOpacityHelp'),
        ['grid', 'opacity'],
        base.grid.opacity,
      )}
      {@render flagField(
        t('style.coords'),
        `${t('style.coordsHelp')}\n${t('style.copied')}`,
        ['grid', 'coords'],
        base.grid.coords,
      )}
      {@render numberField(
        t('style.glyphs'),
        `${t('style.glyphsHelp')}\n${t('style.copied')}`,
        ['glyphs'],
        base.glyphs,
      )}
    </div>
  {/snippet}
  {@render card('sheet', sheet)}

  {#snippet ground()}
    <div class="fields">
      {@render numberField(
        t('style.wash'),
        t('style.washHelp'),
        ['ground', 'wash'],
        base.ground.wash,
      )}
      {@render numberField(
        t('style.blend'),
        t('style.blendHelp'),
        ['ground', 'blend'],
        base.ground.blend,
      )}
      {@render numberField(
        t('style.ragged'),
        t('style.raggedHelp'),
        ['ground', 'ragged'],
        base.ground.ragged,
      )}
      {@render numberField(
        t('style.grain'),
        t('style.grainHelp'),
        ['ground', 'grain'],
        base.ground.grain,
      )}
    </div>
  {/snippet}
  {@render card('ground', ground)}

  {#snippet art()}
    <div class="fields">
      {@render choiceField(
        t('style.mode'),
        t('style.modeHelp'),
        ['art', 'mode'],
        ART_MODES,
        (m) => t(`style.modes.${m as 'ink'}`),
        base.art.mode,
      )}
      {@render colorField(t('style.ink'), t('style.inkHelp'), ['art', 'ink'], style.art.ink)}
    </div>
    <h4>{t('style.artTerrains')}<InfoTip text={t('style.artTerrainsHelp')} /></h4>
    <div class="rows">
      <table>
        <thead>
          <tr>
            <th>{t('style.terrain')}</th>
            <th>{t('style.painter')}</th>
            <th>{t('style.density')}</th>
            <th>{t('style.size')}</th>
            <th>{t('style.color')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each artTerrains as [id, value] (id)}
            {@const own = entry(value, 'painter')}
            <tr>
              <td><code>{id}</code></td>
              <td>
                <select
                  aria-label={`${id}: ${t('style.painter')}`}
                  value={own.painter}
                  {disabled}
                  onchange={(e) => setArt(id, { painter: e.currentTarget.value })}
                >
                  {#each PAINTERS as p (p)}<option value={p}>{t(`style.painters.${p}`)}</option
                    >{/each}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.1"
                  placeholder="1"
                  aria-label={`${id}: ${t('style.density')}`}
                  value={(own.density as number | undefined) ?? ''}
                  {disabled}
                  onchange={(e) => setArt(id, { density: number(e.currentTarget.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.1"
                  placeholder="1"
                  aria-label={`${id}: ${t('style.size')}`}
                  value={(own.size as number | undefined) ?? ''}
                  {disabled}
                  onchange={(e) => setArt(id, { size: number(e.currentTarget.value) })}
                />
              </td>
              <td class="color">
                <input
                  type="color"
                  aria-label={`${id}: ${t('style.color')}`}
                  value={(own.color as string | undefined) ?? '#000000'}
                  class:unset={own.color === undefined}
                  {disabled}
                  onchange={(e) => setArt(id, { color: e.currentTarget.value })}
                />
                {#if own.color !== undefined && !disabled}
                  <button
                    type="button"
                    class="icon"
                    aria-label={t('style.reset')}
                    use:tooltip={t('style.reset')}
                    onclick={() => setArt(id, { color: undefined })}>×</button
                  >
                {/if}
              </td>
              <td>
                {#if !disabled}
                  <button
                    type="button"
                    class="icon"
                    aria-label={t('style.remove')}
                    use:tooltip={t('style.remove')}
                    onclick={() => removeEntry(['art', 'terrains', id], id)}>×</button
                  >
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if !disabled}
      <form
        class="add"
        onsubmit={(e) => {
          e.preventDefault()
          addTerrain()
        }}
      >
        <SuggestInput
          label={t('style.newTerrain')}
          placeholder={t('style.newTerrain')}
          value={newTerrain}
          list={freeTerrains}
          onchange={(text) => (newTerrain = text)}
        />
        <button type="submit" class="button">{t('style.addTerrain')}</button>
      </form>
    {/if}
  {/snippet}
  {@render card('art', art)}

  {#snippet shores()}
    <div class="fields">
      {@render numberField(
        t('style.shoreLines'),
        t('style.shoreLinesHelp'),
        ['shores', 'lines'],
        base.shores.lines,
        5,
        1,
      )}
      {@render colorField(
        t('style.shoreColor'),
        t('style.shoreColorHelp'),
        ['shores', 'color'],
        style.shores.color,
      )}
      {@render numberField(
        t('style.band'),
        t('style.bandHelp'),
        ['shores', 'band'],
        base.shores.band,
      )}
    </div>
  {/snippet}
  {@render card('shores', shores)}

  {#snippet paths()}
    <div class="fields">
      {@render numberField(
        t('style.wobble'),
        t('style.wobbleHelp'),
        ['paths', 'wobble'],
        base.paths.wobble,
      )}
      {#each STYLED_PATHS as kind (kind)}
        {@render colorField(
          `${t(`style.pathKinds.${kind}`)}: ${t('style.color')}`,
          t('style.pathHelp'),
          ['paths', kind, 'color'],
          undefined,
        )}
        {@render numberField(
          `${t(`style.pathKinds.${kind}`)}: ${t('style.width')}`,
          t('style.pathHelp'),
          ['paths', kind, 'width'],
          style.paths.kinds[kind]?.width ?? 0,
          0.1,
          0.01,
        )}
      {/each}
    </div>
  {/snippet}
  {@render card('paths', paths)}

  {#snippet floors()}
    <div class="fields">
      {@render colorField(
        t('style.floorColor'),
        t('style.floorColorHelp'),
        ['floors', 'color'],
        style.floors.color,
      )}
      {@render numberField(
        t('style.floorWash'),
        t('style.floorWashHelp'),
        ['floors', 'wash'],
        base.floors.wash,
      )}
      {@render numberField(
        t('style.floorGrid'),
        t('style.floorGridHelp'),
        ['floors', 'grid'],
        base.floors.grid,
      )}
    </div>
  {/snippet}
  {@render card('floors', floors)}

  {#snippet walls()}
    <div class="fields">
      {@render colorField(
        t('style.wallColor'),
        t('style.wallColorHelp'),
        ['walls', 'color'],
        style.walls.color,
      )}
      {@render numberField(
        t('style.wallWidth'),
        t('style.wallWidthHelp'),
        ['walls', 'width'],
        base.walls.width,
        0.5,
        0.01,
      )}
      {@render choiceField(
        t('style.outside'),
        t('style.outsideHelp'),
        ['walls', 'outside'],
        WALL_OUTSIDES,
        (o) => t(`style.outsides.${o as 'none'}`),
        base.walls.outside,
      )}
      {@render numberField(
        t('style.wallBand'),
        t('style.wallBandHelp'),
        ['walls', 'band'],
        base.walls.band,
      )}
    </div>
  {/snippet}
  {@render card('walls', walls)}

  {#snippet roofs()}
    <div class="fields">
      {@render choiceField(
        t('style.roofKind'),
        t('style.roofKindHelp'),
        ['roofs', 'kind'],
        ROOF_KINDS,
        (k) => t(`style.roofKinds.${k as 'none'}`),
        base.roofs.kind,
      )}
      {@render colorField(
        t('style.roofColor'),
        t('style.roofColorHelp'),
        ['roofs', 'color'],
        style.roofs.color,
      )}
      {@render numberField(
        t('style.roofShadow'),
        t('style.roofShadowHelp'),
        ['roofs', 'shadow'],
        base.roofs.shadow,
      )}
    </div>
  {/snippet}
  {@render card('roofs', roofs)}

  {#snippet looks()}
    <p class="help">{t('style.connections.said')}<InfoTip text={t('style.connectionsHelp')} /></p>
    <div class="rows">
      <table>
        <thead>
          <tr>
            <th>{t('style.kind')}</th>
            <th>{t('style.symbol')}</th>
            <th>{t('style.line')}</th>
            <th>{t('style.color')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each connections as [kind, value] (kind)}
            {@const own = entry(value, 'symbol')}
            {@const look = style.connections[kind]}
            <tr>
              <td><code>{kind}</code></td>
              <td>
                <select
                  aria-label={`${kind}: ${t('style.symbol')}`}
                  value={own.symbol ?? 'diamond'}
                  {disabled}
                  onchange={(e) => setLook(kind, { symbol: e.currentTarget.value })}
                >
                  {#each CONNECTION_SYMBOLS as s (s)}<option value={s}
                      >{t(`style.symbols.${s}`)}</option
                    >{/each}
                </select>
              </td>
              <td>
                <select
                  aria-label={`${kind}: ${t('style.line')}`}
                  value={(own.line as string | undefined) ?? look?.line ?? 'dashed'}
                  {disabled}
                  onchange={(e) => setLook(kind, { line: e.currentTarget.value })}
                >
                  {#each CONNECTION_LINES as l (l)}<option value={l}>{t(`style.lines.${l}`)}</option
                    >{/each}
                </select>
              </td>
              <td class="color">
                <input
                  type="color"
                  aria-label={`${kind}: ${t('style.color')}`}
                  value={(own.color as string | undefined) ?? style.art.ink}
                  class:unset={own.color === undefined}
                  {disabled}
                  onchange={(e) => setLook(kind, { color: e.currentTarget.value })}
                />
                {#if own.color !== undefined && !disabled}
                  <button
                    type="button"
                    class="icon"
                    aria-label={t('style.reset')}
                    use:tooltip={t('style.reset')}
                    onclick={() => setLook(kind, { color: undefined })}>×</button
                  >
                {/if}
              </td>
              <td>
                {#if !disabled}
                  <button
                    type="button"
                    class="icon"
                    aria-label={t('style.remove')}
                    use:tooltip={t('style.remove')}
                    onclick={() => removeEntry(['connections', kind], kind)}>×</button
                  >
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if !disabled}
      <form
        class="add"
        onsubmit={(e) => {
          e.preventDefault()
          addKind()
        }}
      >
        <SuggestInput
          label={t('style.newKind')}
          placeholder={t('style.newKind')}
          value={newKind}
          list={freeKinds}
          onchange={(text) => (newKind = text)}
        />
        <button type="submit" class="button">{t('style.addKind')}</button>
      </form>
    {/if}
  {/snippet}
  {@render card('connections', looks)}

  {#snippet captions()}
    <div class="help"><Markdown text={t('style.copied')} /></div>
    {#each CAPTION_KINDS as kind (kind)}
      {@const shown = style.captions[kind as CaptionKind]}
      <h4>{t(`style.captionKinds.${kind}`)}</h4>
      <div class="fields">
        {@render flagField(t('style.show'), '', ['captions', kind, 'show'], shown.show)}
        <label class="field">
          <span>{t('style.font')}</span>
          <select
            value={(get(['captions', kind, 'font']) as string | undefined) ?? shown.font}
            {disabled}
            onchange={(e) => set(['captions', kind, 'font'], e.currentTarget.value)}
          >
            {#each LABEL_FONTS as f (f)}<option value={f}>{t(`style.fonts.${f}`)}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>{t('style.textSize')}</span>
          <input
            type="number"
            min="0"
            max="4"
            step="0.1"
            placeholder={String(base.captions[kind].size)}
            value={(get(['captions', kind, 'size']) as number | undefined) ?? ''}
            {disabled}
            onchange={(e) => set(['captions', kind, 'size'], number(e.currentTarget.value))}
          />
        </label>
        {@render colorField(t('style.color'), '', ['captions', kind, 'color'], shown.color)}
        {@render flagField(t('style.italic'), '', ['captions', kind, 'italic'], shown.italic)}
        {@render flagField(t('style.halo'), '', ['captions', kind, 'halo'], shown.halo)}
        {@render colorField(
          t('style.haloColor'),
          '',
          ['captions', kind, 'haloColor'],
          shown.haloColor,
        )}
      </div>
    {/each}
  {/snippet}
  {@render card('captions', captions)}

  {#snippet regions()}
    <div class="help"><Markdown text={t('style.copied')} /></div>
    <div class="fields">
      {@render numberField(
        t('style.fill'),
        t('style.fillHelp'),
        ['regions', 'fill'],
        base.regions.fill,
      )}
      {@render numberField(
        t('style.border'),
        t('style.borderHelp'),
        ['regions', 'border'],
        base.regions.border,
        1,
        0.01,
      )}
      {@render flagField(t('style.dashed'), '', ['regions', 'dashed'], base.regions.dashed)}
      {@render numberField(
        t('style.borderOpacity'),
        t('style.borderOpacityHelp'),
        ['regions', 'borderOpacity'],
        base.regions.borderOpacity,
      )}
    </div>
  {/snippet}
  {@render card('regions', regions)}
</div>

<style>
  .style-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 760px;
  }

  .card {
    padding: 4px 8px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 6px 0 6px 1.2em;
  }

  .fields {
    display: grid;
    grid-template-columns: minmax(6em, max-content) minmax(9em, 1fr);
    gap: 6px 12px;
    align-items: start;
  }

  .field {
    display: contents;
    font-size: 12px;
  }

  .field > span:first-child {
    padding-top: 4px;
    color: var(--text-muted);
  }

  .field input[type='number'] {
    width: 6em;
  }

  .field input[type='checkbox'] {
    justify-self: start;
    margin-top: 6px;
  }

  .field select {
    justify-self: start;
    max-width: 100%;
  }

  .field input[type='text'],
  .field textarea {
    width: 100%;
    box-sizing: border-box;
  }

  .color {
    display: flex;
    gap: 6px;
    align-items: center;
    min-width: 0;
  }

  /* In a narrow panel (Map's) the code gives way: the swatch says it too. */
  .color code {
    min-width: 0;
    overflow: hidden;
    font-size: 11px;
    color: var(--text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .color button {
    flex: none;
  }

  input[type='color'] {
    flex: none;
    width: 2.4em;
    height: 1.7em;
    padding: 0 2px;
  }

  input[type='color'].unset {
    opacity: 0.45;
  }

  h4 {
    margin: 4px 0 0;
    font-size: 12px;
    font-weight: 600;
  }

  .rows {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    font-size: 12px;
  }

  th {
    padding: 2px 4px;
    font-weight: normal;
    color: var(--text-muted);
    text-align: left;
    white-space: nowrap;
  }

  td {
    padding: 2px 4px;
  }

  td input[type='number'] {
    width: 5.5em;
  }

  .add {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .help,
  .help :global(p) {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .problems {
    padding: 6px 10px;
    font-size: 12px;
    color: var(--danger, #c0392b);
    border: 1px solid currentColor;
    border-radius: 6px;
  }

  .problems p,
  .problems ul {
    margin: 0;
  }
</style>
