<script lang="ts">
  import { idText, translator } from '@open-tabletop/travel-ui'
  import { confirmAction, InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { contextSuggestions } from '@open-tabletop/session'
  import { library } from '../../lib/packs.svelte'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { getLocale, t } from '../../lib/i18n'
  import { systems } from '../../lib/packs.svelte'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import type { SystemDoc } from '../../lib/systemDoc.svelte'

  /**
   * The checks of the rules, each with the table that resolves it (from the bindings):
   * one place to say "at dawn, unless on a road, roll getting-lost". Then the party stats.
   */
  let { doc }: { doc: SystemDoc } = $props()

  type Raw = Record<string, unknown>
  const AT = ['day-start', 'hex-enter', 'camp'] as const
  /** The system's own actions can trigger checks too (at: <action id>). */
  const ownActions = $derived(
    Object.entries((doc.rules.actions ?? {}) as Record<string, unknown>)
      .filter(([id, a]) => id !== 'camp' && id !== 'rest' && a !== false)
      .map(([id]) => id),
  )
  /** A check's name or description in the UI language (its translation file if it isn't the pack's). */
  const checkText = (check: Raw, key: 'name' | 'description') =>
    doc.text('travel-rules', check[key], ['checks', String(check.event), key])
  function setCheckText(i: number, check: Raw, key: 'name' | 'description', text: string) {
    doc.setText(
      'travel-rules',
      ['checks', i, key],
      check[key],
      ['checks', String(check.event), key],
      text,
    )
  }
  const tt = translator(getLocale)
  /** What check conditions and tables can read, for suggestions while typing. */
  const hints = $derived(contextSuggestions(library.registry))
  const eventName = (event: string) =>
    idText(tt, `events.${event}`, event.replace(/_CHECK_REQUIRED$/, '').toLowerCase())

  const checks = $derived((Array.isArray(doc.rules.checks) ? doc.rules.checks : []) as Raw[])
  const on = $derived((doc.bindings?.on ?? {}) as Record<string, Raw | null>)
  const stats = $derived(Object.entries((doc.bindings?.stats ?? {}) as Record<string, Raw | null>))
  const disabled = $derived(!doc.editable)
  /** Bindings for events no check emits: harmless, but probably left over. */
  const orphans = $derived(Object.keys(on).filter((e) => !checks.some((c) => c.event === e)))
  /** Event names other systems use, as suggestions. */
  const known = $derived([
    ...new Set([
      'WEATHER_CHECK_REQUIRED',
      'NAVIGATION_CHECK_REQUIRED',
      'ENCOUNTER_CHECK_REQUIRED',
      'CAMP_ENCOUNTER_CHECK_REQUIRED',
      'LANDMARK_CHECK_REQUIRED',
      ...systems.list.flatMap((s) => (s.rules.checks ?? []).map((c) => c.event)),
    ]),
  ])
  const eventsId = $props.id()
  /** A map as `key: value` pairs, without the outer braces. */
  const bare = (value: unknown) => flowText(value).replace(/^\{\s*|\s*\}$/g, '')

  function setFlow(path: (string | number)[], kind: 'travel-rules' | 'bindings', text: string) {
    const value = parseFlow(text)
    if (value === null) return showToast(t('forms.badFlow'), 'error')
    doc.edit(kind, path, value)
  }

  /** Renaming an event takes its table along, unless another check still uses it. */
  function rename(index: number, from: string, next: string) {
    const to = next.trim().toUpperCase().replace(/\s+/g, '_')
    if (!to || to === from) return
    doc.edit('travel-rules', ['checks', index, 'event'], to)
    const shared = checks.some((c, i) => i !== index && c.event === from)
    if (!shared) doc.renameTranslations('travel-rules', ['checks'], from, to)
    if (on[from] && !shared && !on[to]) doc.rename('bindings', ['on'], from, to)
  }

  /** A table (`ref`) or a weather model (`weather:<id>`) resolves the check, or nothing. */
  function setTable(event: string, ref: string) {
    if (!ref) return doc.edit('bindings', ['on', event], undefined)
    const weather = ref.startsWith('weather:') ? ref.slice(8) : undefined
    const [key, other] = weather ? ['weather', 'resolve'] : ['resolve', 'weather']
    if (!on[event]) return doc.edit('bindings', ['on', event], { [key]: weather ?? ref })
    doc.edit('bindings', ['on', event, other], undefined)
    doc.edit('bindings', ['on', event, key], weather ?? ref)
  }

  async function remove(index: number, event: string) {
    if (!(await confirmAction(t('forms.confirmRemove', { name: eventName(event) })))) return
    doc.remove('travel-rules', ['checks'], index)
    if (on[event] && !checks.some((c, i) => i !== index && c.event === event))
      doc.edit('bindings', ['on', event], undefined)
  }

  function add() {
    const used = checks.map((c) => String(c.event))
    const event = known.find((e) => !used.includes(e)) ?? 'NEW_CHECK_REQUIRED'
    doc.insert('travel-rules', ['checks'], checks.length, { event, at: 'hex-enter' })
  }

  /** A stat's name or description in the UI language (as checks' texts). */
  const statText = (id: string, stat: Raw | null, field: 'name' | 'description') =>
    doc.text('bindings', stat?.[field], ['stats', id, field])

  /** "Sea legs" → "seaLegs": how tables write it ({{seaLegs}}). */
  const camel = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
      .replace(/^[^A-Za-z]+/, '')
      .replace(/^./, (c) => c.toLowerCase())

  function setText(id: string, field: 'name' | 'description', current: unknown, text: string) {
    doc.setText('bindings', ['stats', id, field], current, ['stats', id, field], text)
    // A stat still called stat, stat-2… takes its id from its name.
    const id2 = camel(text)
    if (field === 'name' && /^stat(-\d+)?$/.test(id) && id2 && !stats.some(([s]) => s === id2))
      doc.rename('bindings', ['stats'], id, id2)
  }

  function renameStat(id: string, next: string) {
    const to = next.trim()
    if (!to || to === id) return
    if (stats.some(([s]) => s === to)) return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename('bindings', ['stats'], id, to)
  }

  function addStat() {
    const id = freeId(
      'stat',
      stats.map(([s]) => s),
    )
    doc.edit('bindings', ['stats', id], { default: 0 })
  }
</script>

<div class="form">
  <section>
    <h3>{t('checks.title')}<InfoTip text={t('checks.help')} /></h3>
    {#each checks as check, i (i)}
      {@const event = String(check.event ?? '')}
      {@const binding = on[event]}
      {@const ref = binding?.weather
        ? `weather:${binding.weather}`
        : String(binding?.resolve ?? '')}
      <div class="check">
        <div class="row">
          <label class="event">
            <span>{t('checks.event')} · <em>{eventName(event)}</em></span>
            <input
              type="text"
              list={eventsId}
              value={event}
              {disabled}
              onchange={(e) => rename(i, event, e.currentTarget.value)}
            />
          </label>
          <label>
            <span>{t('checks.at')}</span>
            <select
              value={check.at}
              {disabled}
              onchange={(e) => doc.edit('travel-rules', ['checks', i, 'at'], e.currentTarget.value)}
            >
              {#each AT as at (at)}<option value={at}>{t(`checks.atOptions.${at}`)}</option>{/each}
              {#each ownActions as id (id)}<option value={id}
                  >{t('checks.atAction', { action: id })}</option
                >{/each}
            </select>
          </label>
          {#if !disabled}
            <button
              class="icon"
              aria-label={t('forms.remove')}
              use:tooltip={t('forms.remove')}
              onclick={() => remove(i, event)}>×</button
            >
          {/if}
        </div>
        <div class="row">
          <label>
            <span>{t('checks.name')}<InfoTip text={t('checks.nameHelp')} /></span>
            <input
              type="text"
              placeholder={doc.translating
                ? doc.baseText(check.name) || eventName(event)
                : eventName(event)}
              value={checkText(check, 'name')}
              {disabled}
              onchange={(e) => setCheckText(i, check, 'name', e.currentTarget.value)}
            />
          </label>
          <label>
            <span>{t('checks.description')}</span>
            <textarea
              rows="2"
              placeholder={doc.translating ? doc.baseText(check.description) : ''}
              value={checkText(check, 'description')}
              {disabled}
              onchange={(e) => setCheckText(i, check, 'description', e.currentTarget.value)}
            ></textarea>
          </label>
        </div>
        <div class="row">
          <label>
            <span>{t('checks.when')}<InfoTip text={t('checks.conditionHelp')} /></span>
            <SuggestInput
              placeholder={t('checks.always')}
              value={bare(check.when)}
              suggestions={hints}
              {disabled}
              onchange={(text) => setFlow(['checks', i, 'when'], 'travel-rules', text)}
            />
          </label>
          <label>
            <span>{t('checks.unless')}<InfoTip text={t('checks.conditionHelp')} /></span>
            <SuggestInput
              placeholder={t('checks.never')}
              value={bare(check.unless)}
              suggestions={hints}
              {disabled}
              onchange={(text) => setFlow(['checks', i, 'unless'], 'travel-rules', text)}
            />
          </label>
        </div>
        <div class="row">
          <label>
            <span>{t('checks.resolve')}<InfoTip text={t('checks.resolveHelp')} /></span>
            <select value={ref} {disabled} onchange={(e) => setTable(event, e.currentTarget.value)}>
              <option value="">{t('checks.waits')}</option>
              {#if ref && !doc.targets.some((x) => x.ref === ref)}
                <option value={ref}>{ref} ⚠</option>
              {/if}
              {#if doc.weatherModels.length}
                <optgroup label={t('checks.weatherModels')}>
                  {#each doc.weatherModels as m (m)}
                    <option value="weather:{m}">{t('checks.weatherModel', { model: m })}</option>
                  {/each}
                </optgroup>
              {/if}
              {#each doc.targets as x (x.ref)}
                <option value={x.ref}>{x.name} ({x.ref})</option>
              {/each}
            </select>
          </label>
          {#if binding}
            <label>
              <span>{t('checks.context')}<InfoTip text={t('checks.contextHelp')} /></span>
              <SuggestInput
                placeholder="timeOfDay: night"
                value={bare(binding.context)}
                suggestions={hints}
                {disabled}
                onchange={(text) => setFlow(['on', event, 'context'], 'bindings', text)}
              />
            </label>
          {/if}
        </div>
      </div>
    {:else}
      <p class="help">{t('checks.none')}</p>
    {/each}
    <datalist id={eventsId}>
      {#each known as e (e)}<option value={e}>{eventName(e)}</option>{/each}
    </datalist>
    {#if !disabled}<button class="add" onclick={add}>{t('checks.add')}</button>{/if}
    {#if orphans.length}
      <p class="help">
        {t('checks.orphans', { events: orphans.join(', ') })}
        {#if !disabled}
          <button
            class="link"
            onclick={() => orphans.forEach((e) => doc.edit('bindings', ['on', e], undefined))}
            >{t('checks.removeOrphans')}</button
          >
        {/if}
      </p>
    {/if}
  </section>

  <section>
    <h3>{t('checks.stats')}<InfoTip text={t('checks.statsHelp')} /></h3>
    {#if stats.length}
      <table>
        <thead>
          <tr>
            <th>{t('forms.id')}</th>
            <th>{t('checks.statName')}</th>
            <th>{t('checks.statDescription')}</th>
            <th>{t('checks.statDefault')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each stats as [id, stat] (id)}
            <tr>
              <td>
                <input
                  type="text"
                  value={id}
                  {disabled}
                  aria-label={t('forms.id')}
                  onchange={(e) => renameStat(id, e.currentTarget.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder={doc.translating ? doc.baseText(stat?.name) : ''}
                  value={statText(id, stat, 'name')}
                  {disabled}
                  aria-label={t('checks.statName')}
                  onchange={(e) => setText(id, 'name', stat?.name, e.currentTarget.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder={doc.translating ? doc.baseText(stat?.description) : ''}
                  value={statText(id, stat, 'description')}
                  {disabled}
                  aria-label={t('checks.statDescription')}
                  onchange={(e) =>
                    setText(id, 'description', stat?.description, e.currentTarget.value)}
                />
              </td>
              <td class="num">
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={stat?.default ?? ''}
                  {disabled}
                  aria-label={t('checks.statDefault')}
                  onchange={(e) => {
                    const v = e.currentTarget.value.trim()
                    doc.edit('bindings', ['stats', id, 'default'], v === '' ? undefined : Number(v))
                  }}
                />
              </td>
              <td>
                {#if !disabled}
                  <button
                    class="icon"
                    aria-label={t('forms.remove')}
                    use:tooltip={t('forms.remove')}
                    onclick={async () =>
                      (await confirmAction(
                        t('forms.confirmRemove', { name: statText(id, stat, 'name') || id }),
                      )) && doc.edit('bindings', ['stats', id], undefined)}>×</button
                  >
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="help">{t('checks.noStats')}</p>
    {/if}
    {#if !disabled}<button class="add" onclick={addStat}>{t('checks.addStat')}</button>{/if}
  </section>
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 820px;
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

  .check {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .row {
    display: flex;
    gap: 10px;
    align-items: end;
  }

  .row label {
    flex: 1;
    min-width: 0;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  label input,
  label select,
  label textarea {
    width: 100%;
    min-width: 0;
  }

  label textarea {
    resize: vertical;
  }

  .event {
    flex: 2 !important;
  }

  em {
    font-style: normal;
    color: var(--accent);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    padding: 0 4px 4px;
    font-size: 12px;
    font-weight: normal;
    color: var(--text-muted);
    text-align: left;
  }

  td {
    padding: 2px 4px;
  }

  td input {
    width: 100%;
    min-width: 0;
  }

  .num {
    width: 80px;
  }

  .icon {
    height: 30px;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .link {
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .add {
    align-self: flex-start;
    padding: 4px 10px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>
