<script lang="ts">
  import { InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { contextSuggestions, setSuggestions } from '@open-tabletop/session'
  import { workspace } from '../../lib/packs/workspace.svelte'
  import { moveKey, renameKey, setIn } from '@open-tabletop/pack-ui/yaml'
  import { t, type MessageKey } from '../../lib/i18n'
  import { slugify } from '../../lib/packs/definitions'
  import { nextId, type DefinitionDoc } from '../../lib/packs/doc.svelte'
  import TextField from './TextField.svelte'

  /**
   * A generator: named fields (each from a table, a generator, dice or a fixed value)
   * put together by a template that writes {{field}} where each value goes.
   */
  let { doc }: { doc: DefinitionDoc } = $props()

  const SOURCES = ['table', 'generator', 'roll', 'value'] as const
  type Source = (typeof SOURCES)[number]
  type RawField = Partial<Record<Source, unknown>> & {
    when?: unknown
    unless?: unknown
    context?: unknown
  }
  const EXTRAS = [
    { key: 'when', label: 'edit.when', help: 'edit.fieldWhenHelp', example: 'season: winter' },
    { key: 'unless', label: 'edit.unless', help: 'edit.fieldWhenHelp', example: 'tags: road' },
    {
      key: 'context',
      label: 'edit.fieldContext',
      help: 'edit.fieldContextHelp',
      example: 'danger: 3',
    },
  ] as const
  type Extra = (typeof EXTRAS)[number]['key']

  const conditionHints = $derived(contextSuggestions(workspace.registry))
  const setHints = $derived(setSuggestions(workspace.registry))
  /** Fields showing their conditions and context. */
  let open = $state<Record<string, boolean>>({})
  let invalid = $state<Record<string, boolean>>({})
  const hasExtras = (f: RawField) => EXTRAS.some(({ key }) => f[key] !== undefined)
  const flowOf = (value: unknown) =>
    value === undefined ? '' : flowText(value).replace(/^\{\s*|\s*\}$/g, '')

  /** A field's condition or context typed as one line: saved when it reads as a map. */
  function setExtra(name: string, key: Extra, text: string) {
    const value = text.trim() ? parseFlow(text) : undefined
    invalid = { ...invalid, [`${name}.${key}`]: value === null }
    if (value !== null) doc.edit(['fields', name, key], value ?? undefined)
  }

  const id = $derived(doc.def.localId)
  const fields = $derived(Object.entries((doc.raw.fields as Record<string, RawField>) ?? {}))
  const sourceOf = (f: RawField): Source => SOURCES.find((s) => f[s] !== undefined) ?? 'value'

  function rename(name: string, next: string) {
    const to = slugify(next).replaceAll('-', '_')
    if (!to || to === name) return
    if (fields.some(([n]) => n === to))
      return showToast(t('edit.fieldExists', { field: to }), 'error')
    doc.save(renameKey(doc.content, id, ['fields'], name, to))
  }

  /** Switching the source keeps the text typed so far when it still makes sense. */
  function setSource(name: string, field: RawField, source: Source) {
    const current = field[sourceOf(field)]
    const text = typeof current === 'string' ? current : ''
    const value =
      source === 'roll'
        ? '1d6'
        : source === 'value'
          ? (current ?? 0)
          : doc.targets.some((x) => x.kind === source && x.ref === text)
            ? text
            : (doc.targets.find((x) => x.kind === source)?.ref ?? text) || name
    let out = doc.content
    for (const s of SOURCES) out = setIn(out, id, ['fields', name, s], undefined)
    doc.save(setIn(out, id, ['fields', name, source], value))
  }

  /** Numbers stay numbers for fixed values; an empty box keeps the previous value. */
  function setValue(name: string, source: Source, raw: string) {
    if (!raw.trim()) return
    const n = Number(raw)
    doc.edit(['fields', name, source], source === 'value' && Number.isFinite(n) ? n : raw.trim())
  }

  function add() {
    const name = nextId(
      fields.map(([n]) => n),
      'field',
    )
    doc.edit(['fields', name], { roll: '1d6' })
  }

  /** Appends {{name}} to the template (or its translation). */
  function insert(name: string) {
    const key = ['template']
    const current = doc.translating ? doc.overlayText(key) : String(doc.raw.template ?? '')
    const text = `${current}${current && !current.endsWith(' ') ? ' ' : ''}{{${name}}}`
    if (doc.translating) doc.translate(key, text)
    else doc.edit(key, text)
  }
</script>

<div class="generator">
  <label class="field">
    <span>{t('edit.template')}<InfoTip text={t('edit.templateHelp')} /></span>
    <TextField {doc} path={['template']} multiline />
  </label>
  {#if fields.length}
    <div class="chips">
      {#each fields as [name] (name)}
        <button use:tooltip={t('edit.insertField')} onclick={() => insert(name)}
          >{`{{${name}}}`}</button
        >
      {/each}
    </div>
  {/if}

  <h3 class="section-title">{t('edit.fields')}<InfoTip text={t('edit.fieldsHelp')} /></h3>
  <table>
    <thead>
      <tr>
        <th>{t('edit.fieldName')}</th>
        <th>{t('edit.fieldSource')}</th>
        <th class="wide">{t('edit.fieldValue')}</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each fields as [name, field], i (name)}
        {@const source = sourceOf(field)}
        <tr>
          <td class="name">
            <input
              type="text"
              value={name}
              disabled={doc.translating}
              onchange={(e) => rename(name, e.currentTarget.value)}
            />
          </td>
          <td class="source">
            <select
              value={source}
              disabled={doc.translating}
              onchange={(e) => setSource(name, field, e.currentTarget.value as Source)}
            >
              {#each SOURCES as s (s)}
                <option value={s}>{t(`edit.sources.${s}` as MessageKey)}</option>
              {/each}
            </select>
          </td>
          <td>
            <input
              type="text"
              list={source === 'table' || source === 'generator' ? `gen-${source}` : undefined}
              value={String(field[source] ?? '')}
              disabled={doc.translating}
              onchange={(e) => setValue(name, source, e.currentTarget.value)}
            />
            {#if !doc.translating}
              <button class="more" onclick={() => (open[name] = !(open[name] ?? hasExtras(field)))}
                >{(open[name] ?? hasExtras(field)) ? '▾' : '▸'} {t('edit.fieldMore')}</button
              >
            {/if}
            {#if (open[name] ?? hasExtras(field)) && !doc.translating}
              <div class="extras">
                {#each EXTRAS as extra (extra.key)}
                  <label>
                    <span>{t(extra.label)}<InfoTip text={t(extra.help)} /></span>
                    <SuggestInput
                      value={flowOf(field[extra.key])}
                      suggestions={extra.key === 'context' ? setHints : conditionHints}
                      placeholder={extra.example}
                      invalid={invalid[`${name}.${extra.key}`]}
                      onchange={(text) => setExtra(name, extra.key, text)}
                    />
                    {#if invalid[`${name}.${extra.key}`]}<small>{t('edit.notAMap')}</small>{/if}
                  </label>
                {/each}
              </div>
            {/if}
          </td>
          <td class="row-actions">
            <div>
              <button
                class="icon"
                aria-label={t('edit.moveUp')}
                use:tooltip={t('edit.moveUp')}
                disabled={i === 0 || doc.translating}
                onclick={() => doc.save(moveKey(doc.content, id, ['fields'], name, i - 1))}
                >↑</button
              >
              <button
                class="icon"
                aria-label={t('edit.moveDown')}
                use:tooltip={t('edit.moveDown')}
                disabled={i === fields.length - 1 || doc.translating}
                onclick={() => doc.save(moveKey(doc.content, id, ['fields'], name, i + 1))}
                >↓</button
              >
              <button
                class="icon"
                aria-label={t('edit.remove')}
                use:tooltip={t('edit.remove')}
                disabled={fields.length <= 1 || doc.translating}
                onclick={() => doc.edit(['fields', name], undefined)}>×</button
              >
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#each ['table', 'generator'] as const as kind (kind)}
    <datalist id="gen-{kind}">
      {#each doc.targets.filter((x) => x.kind === kind) as x (x.ref)}<option value={x.ref}
        ></option>{/each}
    </datalist>
  {/each}
  {#if !doc.translating}
    <div class="add-row"><button onclick={add}>{t('edit.addField')}</button></div>
  {/if}
</div>

<style>
  .generator {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .chips button {
    padding: 2px 8px;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: var(--accent);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    cursor: pointer;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    padding: 4px;
    font-size: 12px;
    font-weight: normal;
    color: var(--text-muted);
    text-align: left;
  }

  td {
    padding: 3px 4px;
    vertical-align: top;
  }

  td input,
  td select {
    width: 100%;
  }

  .name {
    width: 140px;
  }

  .source {
    width: 130px;
  }

  .wide {
    width: 60%;
  }

  .row-actions {
    width: 1%;
  }

  .row-actions div {
    display: flex;
    gap: 2px;
  }

  .row-actions .icon {
    width: 24px;
    height: 28px;
  }

  .row-actions .icon:disabled {
    opacity: 0.3;
    cursor: default;
  }

  small {
    display: block;
    color: #e3a19f;
  }

  .more {
    margin-top: 2px;
    padding: 0;
    font-size: 12px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  .extras {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12em, 1fr));
    gap: 6px 10px;
    margin-top: 4px;
  }

  .extras label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
