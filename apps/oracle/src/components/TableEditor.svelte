<script lang="ts">
  import type { CompiledTable } from '@open-tabletop/oracle-engine'
  import { InfoTip, tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { manifestOf, overlayLocales, overlayPath } from '../lib/packs/workspace'
  import {
    getOverlayText,
    insertIn,
    moveIn,
    readDefinition,
    removeDefinition,
    removeIn,
    setIn,
    setOverlayText,
  } from '../lib/packs/yaml'

  let { def, root }: { def: CompiledTable; root: string } = $props()

  interface RawEntry {
    id?: string
    range?: string | number
    weight?: number
    result?: string
    table?: string
    generator?: string
    when?: unknown
    set?: unknown
    once?: boolean
    maxOccurrences?: number
  }

  const file = $derived(def.file.slice(root.length + 1))
  const content = $derived(workspace.readFile(root, file) ?? '')
  const raw = $derived(readDefinition(content, def.localId) ?? {})
  const entries = $derived((raw.entries as RawEntry[] | undefined) ?? [])
  const hasRoll = $derived(typeof raw.roll === 'string' && raw.roll.trim() !== '')
  const pack = $derived(workspace.pack(root)!)
  const baseLocale = $derived(manifestOf(pack).locale ?? 'en')
  const locales = $derived(overlayLocales(pack))
  let language = $state('')
  const translating = $derived(language !== '' && language !== baseLocale)
  const overlayFile = $derived(overlayPath(language, file))
  const overlay = $derived(translating ? workspace.readFile(root, overlayFile) : undefined)
  const missingIds = $derived(entries.some((e) => !e.id))

  /** Tables and generators that entries can delegate to (local ids for this pack). */
  const targets = $derived(
    [...workspace.registry.definitions.values()]
      .filter((d) => d.kind === 'table' || d.kind === 'generator')
      .map((d) => ({ kind: d.kind, ref: d.pack === def.pack ? d.localId : d.id })),
  )

  const save = (text: string) => workspace.writeFile(root, file, text)
  const edit = (path: (string | number)[], value: unknown) =>
    save(setIn(content, def.localId, path, value))

  function translate(path: string[], text: string) {
    workspace.writeFile(
      root,
      overlayFile,
      setOverlayText(overlay ?? '', [def.localId, ...path], text),
    )
  }

  const asRange = (v: string) => (/^\s*-?\d+\s*$/.test(v) ? Number(v) : v.trim())

  function setTarget(index: number, kind: 'table' | 'generator' | '', target: string) {
    let text = setIn(content, def.localId, ['entries', index, 'table'], undefined)
    text = setIn(text, def.localId, ['entries', index, 'generator'], undefined)
    if (kind && target.trim())
      text = setIn(text, def.localId, ['entries', index, kind], target.trim())
    save(text)
  }

  function addEntry() {
    // New entries get an id when the others have them, so they can be translated.
    const used = new Set(entries.map((e) => e.id))
    let n = entries.length + 1
    while (used.has(`r${n}`)) n++
    const id = entries.some((e) => e.id) ? { id: `r${n}` } : {}
    const next = hasRoll ? { ...id, range: entries.length + 1, result: '' } : { ...id, result: '' }
    save(insertIn(content, def.localId, ['entries'], entries.length, next))
  }

  function renumber() {
    let text = content
    entries.forEach((_, i) => (text = setIn(text, def.localId, ['entries', i, 'range'], i + 1)))
    entries.forEach((e, i) => {
      if (e.weight !== undefined)
        text = setIn(text, def.localId, ['entries', i, 'weight'], undefined)
    })
    save(setIn(text, def.localId, ['roll'], `1d${entries.length}`))
  }

  function assignIds() {
    // Plain set: a local, non-reactive helper.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const used = new Set(entries.map((e) => e.id).filter(Boolean))
    let text = content
    let n = 1
    entries.forEach((e, i) => {
      if (e.id) return
      while (used.has(`r${n}`)) n++
      used.add(`r${n}`)
      text = setIn(text, def.localId, ['entries', i, 'id'], `r${n}`)
    })
    save(text)
  }

  function remove() {
    if (!confirm(t('edit.confirmDelete', { name: String(raw.name ?? def.localId) }))) return
    save(removeDefinition(content, def.localId))
    go({ name: 'pack', root })
  }

  const advanced = (e: RawEntry) =>
    e.when !== undefined || e.set !== undefined || e.once || e.maxOccurrences !== undefined
</script>

<div class="editor">
  <div class="top">
    <label class="field grow">
      <span>{t('edit.name')}</span>
      {#if translating}
        <input
          type="text"
          placeholder={String(raw.name ?? '')}
          value={getOverlayText(overlay, [def.localId, 'name'])}
          onchange={(e) => translate(['name'], e.currentTarget.value)}
        />
      {:else}
        <input
          type="text"
          value={raw.name ?? ''}
          onchange={(e) => edit(['name'], e.currentTarget.value)}
        />
      {/if}
    </label>
    <label class="field dice">
      <span>{t('edit.roll')}<InfoTip text={t('edit.rollHelp')} /></span>
      <input
        type="text"
        value={raw.roll ?? ''}
        disabled={translating}
        onchange={(e) => edit(['roll'], e.currentTarget.value.trim())}
      />
    </label>
    <label class="field lang">
      <span>{t('edit.language')}<InfoTip text={t('edit.translationHelp')} /></span>
      <select bind:value={language}>
        <option value="">{t('edit.baseLanguage', { locale: baseLocale })}</option>
        {#each locales.filter((l) => l !== baseLocale) as l (l)}
          <option value={l}>{l}</option>
        {/each}
      </select>
    </label>
  </div>
  <label class="field">
    <span>{t('edit.description')}</span>
    {#if translating}
      <input
        type="text"
        placeholder={String(raw.description ?? '')}
        value={getOverlayText(overlay, [def.localId, 'description'])}
        onchange={(e) => translate(['description'], e.currentTarget.value)}
      />
    {:else}
      <input
        type="text"
        value={raw.description ?? ''}
        onchange={(e) => edit(['description'], e.currentTarget.value)}
      />
    {/if}
  </label>

  {#if translating && missingIds}
    <div class="warn">
      {t('edit.needsIds')}
      <button class="link" onclick={assignIds}>{t('edit.assignIds')}</button>
    </div>
  {/if}

  <table>
    <thead>
      <tr>
        <th>{t('edit.id')}<InfoTip text={t('edit.idHelp')} /></th>
        {#if hasRoll}
          <th>{t('edit.range')}<InfoTip text={t('edit.rangeHelp')} /></th>
        {:else}
          <th>{t('edit.weight')}<InfoTip text={t('edit.weightHelp')} /></th>
        {/if}
        <th class="wide">{t('edit.result')}</th>
        <th>{t('edit.then')}<InfoTip text={t('edit.thenHelp')} /></th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each entries as entry, i (i)}
        {@const kind = entry.table ? 'table' : entry.generator ? 'generator' : ''}
        <tr>
          <td class="id">
            <input
              type="text"
              value={entry.id ?? ''}
              disabled={translating}
              onchange={(e) => edit(['entries', i, 'id'], e.currentTarget.value.trim())}
            />
          </td>
          <td class="num">
            {#if hasRoll}
              <input
                type="text"
                value={entry.range ?? ''}
                disabled={translating}
                onchange={(e) => edit(['entries', i, 'range'], asRange(e.currentTarget.value))}
              />
            {:else}
              <input
                type="number"
                min="0"
                step="any"
                value={entry.weight ?? ''}
                placeholder="1"
                disabled={translating}
                onchange={(e) =>
                  edit(
                    ['entries', i, 'weight'],
                    e.currentTarget.value ? Number(e.currentTarget.value) : undefined,
                  )}
              />
            {/if}
          </td>
          <td>
            {#if translating}
              <input
                type="text"
                disabled={!entry.id}
                placeholder={entry.result ?? ''}
                value={entry.id ? getOverlayText(overlay, [def.localId, 'entries', entry.id]) : ''}
                onchange={(e) => translate(['entries', entry.id!], e.currentTarget.value)}
              />
            {:else}
              <input
                type="text"
                value={entry.result ?? ''}
                onchange={(e) => edit(['entries', i, 'result'], e.currentTarget.value)}
              />
            {/if}
            {#if advanced(entry)}
              <small>{t('edit.advanced')}</small>
            {/if}
          </td>
          <td class="then">
            <div>
              <select
                value={kind}
                disabled={translating}
                onchange={(e) => {
                  const k = e.currentTarget.value as 'table' | 'generator' | ''
                  const first = targets.find((x) => x.kind === k)?.ref ?? ''
                  setTarget(i, k, entry.table ?? entry.generator ?? first)
                }}
              >
                <option value="">{t('edit.nothing')}</option>
                <option value="table">{t('kinds.table')}</option>
                <option value="generator">{t('kinds.generator')}</option>
              </select>
              {#if kind}
                <input
                  type="text"
                  list="targets-{kind}"
                  value={entry.table ?? entry.generator ?? ''}
                  disabled={translating}
                  onchange={(e) => setTarget(i, kind, e.currentTarget.value)}
                />
              {/if}
            </div>
          </td>
          <td class="row-actions">
            <div>
              <button
                class="icon"
                aria-label={t('edit.moveUp')}
                use:tooltip={t('edit.moveUp')}
                disabled={i === 0 || translating}
                onclick={() => save(moveIn(content, def.localId, ['entries'], i, i - 1))}>↑</button
              >
              <button
                class="icon"
                aria-label={t('edit.moveDown')}
                use:tooltip={t('edit.moveDown')}
                disabled={i === entries.length - 1 || translating}
                onclick={() => save(moveIn(content, def.localId, ['entries'], i, i + 1))}>↓</button
              >
              <button
                class="icon"
                aria-label={t('edit.remove')}
                use:tooltip={t('edit.remove')}
                disabled={entries.length <= 1 || translating}
                onclick={() => save(removeIn(content, def.localId, ['entries'], i))}>×</button
              >
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <datalist id="targets-table">
    {#each targets.filter((x) => x.kind === 'table') as x (x.ref)}<option value={x.ref}
      ></option>{/each}
  </datalist>
  <datalist id="targets-generator">
    {#each targets.filter((x) => x.kind === 'generator') as x (x.ref)}<option value={x.ref}
      ></option>{/each}
  </datalist>

  {#if !translating}
    <div class="bottom">
      <button onclick={addEntry}>{t('edit.addEntry')}</button>
      <button use:tooltip={t('edit.renumberHelp')} onclick={renumber}
        >{t('edit.renumber', { count: entries.length })}</button
      >
      <button class="link" onclick={() => go({ name: 'file', root, path: file })}
        >{t('edit.openFile', { file })}</button
      >
      <button class="danger" onclick={remove}>{t('edit.deleteDefinition')}</button>
    </div>
  {/if}
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .top {
    display: flex;
    gap: 10px;
  }

  .grow {
    flex: 1;
  }

  .dice {
    width: 160px;
  }

  .lang {
    width: 140px;
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
    white-space: nowrap;
  }

  td {
    padding: 3px 4px;
    vertical-align: top;
  }

  td input,
  td select {
    width: 100%;
  }

  .wide {
    width: 50%;
  }

  .id {
    width: 80px;
  }

  .num {
    width: 76px;
  }

  .then {
    width: 230px;
  }

  .then div,
  .row-actions div {
    display: flex;
    gap: 4px;
  }

  .then select {
    width: 100px;
  }

  .row-actions {
    width: 1%;
  }

  .row-actions div {
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
    font-size: 11px;
    color: #d8c58a;
  }

  .warn {
    font-size: 13px;
    color: #d8c58a;
  }

  .bottom {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .bottom > button:not(.link) {
    padding: 6px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .bottom .danger {
    margin-left: auto;
    color: #e3a19f;
  }
</style>
