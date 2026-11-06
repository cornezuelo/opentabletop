<script lang="ts">
  import { CardHead, CardTools } from '@open-tabletop/pack-ui'
  import ReactionEditor from './ReactionEditor.svelte'
  import { parseRef } from '@open-tabletop/oracle-engine'
  import { idText, translator } from '@open-tabletop/travel-ui'
  import {
    confirmAction,
    InfoTip,
    showToast,
    SuggestInput,
    TagInput,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { contextSuggestions, effectSuggestions, type TravelSystem } from '@open-tabletop/session'
  import { SvelteSet } from 'svelte/reactivity'
  import RecordRows from './RecordRows.svelte'
  import { matches } from '../../lib/search'
  import UsedBy from '../uses/UsedBy.svelte'
  import UsesList from '../uses/UsesList.svelte'
  import { usesFor } from '../../lib/usage'
  import { library } from '../../lib/packs.svelte'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { ConditionEditor, PairEditor } from '@open-tabletop/pack-ui'
  import { getLocale, t } from '../../lib/i18n'
  import { systems } from '../../lib/packs.svelte'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import {
    actionIds,
    momentsList,
    reactionWords,
    momentsText,
    writeMoments,
    ROLLABLE,
    type SystemDoc,
  } from '../../lib/systemDoc.svelte'
  import {
    CHECK_MOMENTS,
    DAY_END,
    doneOf,
    PLACE_ENTER,
    isClock,
    isPartRef,
    ref,
    refId,
    WORLD_DO_TURN,
  } from '@open-tabletop/travel-engine'
  import { dayPartRefs, partLabel } from '../../lib/dayParts'
  import { clockOfMoment, tripWorldMoments } from '../../lib/worldMoments'

  /**
   * The checks of the rules, each with the table that resolves it (from the bindings):
   * one place to say "at dawn, unless on a road, roll getting-lost". Then the party stats.
   */
  let { doc, system }: { doc: SystemDoc; system?: TravelSystem } = $props()

  /** The stat whose uses are shown below its row. */
  let statUses = $state<string | null>(null)

  /** The values of the members' sheet (the system's `sheet`), for stats made of them. */
  const sheetValues = $derived(Object.keys(system?.sheet?.def.values ?? {}))
  const fromHints = $derived({
    party: Object.keys(system?.partySheet?.def.values ?? {}),
    max: sheetValues,
    min: sheetValues,
    sum: sheetValues,
    pick: sheetValues,
    count: ['true'],
    when: [],
    unless: [],
    none: [],
  })

  type Raw = Record<string, unknown>
  /** The moments of the day; then every action of the system (at: <action id>). */
  const AT = CHECK_MOMENTS
  const ownActions = $derived(actionIds(doc.rules))
  /** An action by its name in the UI language (its id if it has none). */
  const actionLabel = (id: string) => {
    const action = ((doc.rules.actions ?? {}) as Record<string, Raw | undefined>)[id]
    return doc.text('travel-rules', action?.name, ['actions', id, 'name']) || id
  }
  /** A check's moments in words: "At dawn · Action: Forage". */
  const saidMoments = (at: unknown) =>
    momentsText(at)
      .split(', ')
      .map((m) =>
        m === PLACE_ENTER
          ? t('checks.atOptions.hex-enter')
          : m === DAY_END
            ? t('checks.atOptions.day-end')
            : isClock(m)
              ? t('checks.atClock', { clock: m })
              : isPartRef(m)
                ? t('checks.atPart', { part: partLabel(system, m, getLocale()) })
                : /^actions\.[^.]+\.done$/.test(m)
                  ? t('checks.atDone', { action: actionLabel(String(m).slice(8, -5)) })
                  : refId('checks', m)
                    ? t('checks.atCheck', { check: checkLabel(refId('checks', m)!) })
                    : refId('actions', m)
                      ? t('checks.atAction', { action: actionLabel(refId('actions', m)!) })
                      : m === WORLD_DO_TURN
                        ? t('worldForm.afterTurn')
                        : clockOfMoment(system, m, getLocale())
                          ? t('checks.atFull', { clock: clockOfMoment(system, m, getLocale())! })
                          : m,
      )
      .filter(Boolean)
      .concat(reactionWords(at))
      .join(' · ')
  /** Every check event of the rules, once each. */
  const checkEvents = $derived([
    ...new Set(
      ((doc.rules.checks ?? []) as Raw[]).map((c) => String(c.event ?? '')).filter(Boolean),
    ),
  ])
  /** A check by its name in the UI language (its event if it has none). */
  const checkLabel = (event: string) => {
    const check = ((doc.rules.checks ?? []) as Raw[]).find((c) => c.event === event)
    return (check && checkText(check, 'name')) || event
  }
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
  const effectHints = $derived(effectSuggestions(library.registry))
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
    doc.edit(kind, path, value && Object.keys(value).length ? value : undefined)
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

  /** A table (`table.<id>`…) or a weather model (`weather.<id>`) resolves the check, or nothing. */
  function setTable(event: string, ref: string) {
    if (!ref) return doc.edit('bindings', ['on', event], undefined)
    const weather = parseRef(ref)?.kind === 'weather' ? ref : undefined
    const [key, other] = weather ? ['weather', 'resolve'] : ['resolve', 'weather']
    if (!on[event]) return doc.edit('bindings', ['on', event], { [key]: weather ?? ref })
    doc.edit('bindings', ['on', event, other], undefined)
    doc.edit('bindings', ['on', event, key], weather ?? ref)
  }

  /** The checks shown unfolded, by place in the list (folded by default: it can be long). */
  const unfolded = new SvelteSet<number>()
  let query = $state('')
  /** What rolls a check (a table's or model's name), or that nothing does. */
  const resolverName = (event: string) => {
    const r = String(on[event]?.weather ?? on[event]?.resolve ?? '')
    if (!r) return t('checks.waits')
    if (doc.weatherModels.includes(r)) return t('checks.weatherModel', { model: r })
    return doc.targets.find((x) => x.ref === r)?.name ?? r
  }
  /** A check in words, folded: when, on what, and whether it pauses. */
  const summary = (check: Raw) =>
    [
      check.at ? saidMoments(check.at) : t('checks.atNone'),
      resolverName(String(check.event)),
      check.pause === true && t('checks.paused'),
    ]
      .filter(Boolean)
      .join(' · ')
  const checkTitle = (check: Raw) => checkText(check, 'name') || eventName(String(check.event))
  const shows = (check: Raw) =>
    matches(query, [
      checkTitle(check),
      checkText(check, 'description'),
      summary(check),
      check,
      on[String(check.event)],
    ])
  const shown = $derived(checks.filter(shows).length)

  async function remove(index: number, event: string) {
    if (!(await confirmAction(t('forms.confirmRemove', { name: eventName(event) })))) return
    doc.remove('travel-rules', ['checks'], index)
    // The cards after it move up one.
    const kept = [...unfolded].flatMap((n) => (n < index ? [n] : n > index ? [n - 1] : []))
    unfolded.clear()
    for (const n of kept) unfolded.add(n)
    if (on[event] && !checks.some((c, i) => i !== index && c.event === event))
      doc.edit('bindings', ['on', event], undefined)
  }

  /** Moves a check to another place: the checks of one moment come in the list's order. */
  function move(from: number, to: number) {
    if (to < 0 || to >= checks.length || from === to) return
    doc.move('travel-rules', ['checks'], from, to)
    // The unfolded cards follow their checks.
    const order = checks.map((_, i) => i)
    const [moved] = order.splice(from, 1)
    order.splice(to, 0, moved)
    const kept = order.flatMap((old, now) => (unfolded.has(old) ? [now] : []))
    unfolded.clear()
    for (const n of kept) unfolded.add(n)
  }

  function add() {
    const used = checks.map((c) => String(c.event))
    const event = known.find((e) => !used.includes(e)) ?? 'NEW_CHECK_REQUIRED'
    doc.insert('travel-rules', ['checks'], checks.length, { event, at: PLACE_ENTER })
    query = ''
    unfolded.add(checks.length)
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
    {#if checks.length > 1}
      <CardTools
        locale={getLocale()}
        bind:query
        {shown}
        total={checks.length}
        label={t('checks.search')}
        onopenall={() => checks.forEach((c, i) => shows(c) && unfolded.add(i))}
        oncloseall={() => unfolded.clear()}
      />
    {/if}
    {#each checks as check, i (i)}
      {@const event = String(check.event ?? '')}
      {@const binding = on[event]}
      {@const resolver = String(binding?.weather ?? binding?.resolve ?? '')}
      {@const open = unfolded.has(i)}
      {#if shows(check)}
        <div class="check">
          <CardHead
            locale={getLocale()}
            title={checkTitle(check)}
            id={event}
            said={open ? undefined : summary(check)}
            {open}
            ontoggle={() => (open ? unfolded.delete(i) : unfolded.add(i))}
            {disabled}
            order={{
              index: i,
              count: checks.length,
              list: 'checks',
              onmove: (by) => move(i, i + by),
              ondrop: (from) => move(from, i),
            }}
          >
            {#if !disabled}
              <button
                class="icon"
                aria-label={t('forms.remove')}
                use:tooltip={t('forms.remove')}
                onclick={() => remove(i, event)}>×</button
              >
            {/if}
          </CardHead>
          {#if open}
            <div class="fields">
              <div class="row">
                <label>
                  <span>{t('checks.event')}</span>
                  <input
                    type="text"
                    list={eventsId}
                    value={event}
                    {disabled}
                    onchange={(e) => rename(i, event, e.currentTarget.value)}
                  />
                </label>
                <label>
                  <span>{t('checks.at')}<InfoTip text={t('checks.atHelp')} /></span>
                  <TagInput
                    label={t('checks.at')}
                    placeholder={t('checks.atNone')}
                    value={momentsList(check.at)}
                    choices={[
                      ...AT,
                      '06:00',
                      ...dayPartRefs(system),
                      ...ownActions.map((a) => ref('actions', a)),
                      ...ownActions.map(doneOf),
                      ...checkEvents.filter((e) => e !== check.event).map((e) => ref('checks', e)),
                      ...tripWorldMoments(system),
                    ]}
                    removeLabel={t('forms.removeItem')}
                    {disabled}
                    onchange={(v) =>
                      doc.edit(
                        'travel-rules',
                        ['checks', i, 'at'],
                        writeMoments(v, undefined, check.at),
                      )}
                  />
                  {#if check.at}<small class="said">{saidMoments(check.at)}</small>{/if}
                </label>
                <ReactionEditor
                  value={check.at}
                  {hints}
                  {disabled}
                  onchange={(at) => doc.edit('travel-rules', ['checks', i, 'at'], at)}
                />
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
                  <span>{t('forms.description')}<InfoTip text={t('forms.descriptionHelp')} /></span>
                  <textarea
                    rows="2"
                    placeholder={doc.translating ? doc.baseText(check.description) : ''}
                    value={checkText(check, 'description')}
                    {disabled}
                    onchange={(e) => setCheckText(i, check, 'description', e.currentTarget.value)}
                  ></textarea>
                </label>
              </div>
              <div class="conditions">
                <div class="part">
                  <span class="label"
                    >{t('checks.when')}<InfoTip text={t('checks.conditionHelp')} /></span
                  >
                  <ConditionEditor
                    value={check.when}
                    suggestions={hints}
                    locale={getLocale()}
                    {disabled}
                    label={t('checks.when')}
                    onchange={(c) => doc.edit('travel-rules', ['checks', i, 'when'], c)}
                  />
                </div>
                <div class="part">
                  <span class="label"
                    >{t('checks.unless')}<InfoTip text={t('checks.conditionHelp')} /></span
                  >
                  <ConditionEditor
                    value={check.unless}
                    suggestions={hints}
                    locale={getLocale()}
                    {disabled}
                    label={t('checks.unless')}
                    onchange={(c) => doc.edit('travel-rules', ['checks', i, 'unless'], c)}
                  />
                </div>
              </div>
              <div class="row">
                <label>
                  <span>{t('checks.resolve')}<InfoTip text={t('checks.resolveHelp')} /></span>
                  <select
                    value={resolver}
                    {disabled}
                    onchange={(e) => setTable(event, e.currentTarget.value)}
                  >
                    <option value="">{t('checks.waits')}</option>
                    {#if resolver && !doc.targets.some((x) => x.ref === resolver) && !doc.weatherModels.includes(resolver)}
                      <option value={resolver}>{resolver} ⚠</option>
                    {/if}
                    {#if doc.weatherModels.length}
                      <optgroup label={t('checks.weatherModels')}>
                        {#each doc.weatherModels as m (m)}
                          <option value={m}>{t('checks.weatherModel', { model: m })}</option>
                        {/each}
                      </optgroup>
                    {/if}
                    {#each ROLLABLE as kind (kind)}
                      {@const of = doc.targets.filter((x) => x.kind === kind)}
                      {#if of.length}
                        <optgroup label={t(`kinds.${kind}`)}>
                          {#each of as x (x.ref)}
                            <option value={x.ref}>{x.name} ({x.ref})</option>
                          {/each}
                        </optgroup>
                      {/if}
                    {/each}
                  </select>
                </label>
                <label class="inline">
                  <input
                    type="checkbox"
                    checked={check.pause === true}
                    {disabled}
                    onchange={(e) =>
                      doc.edit(
                        'travel-rules',
                        ['checks', i, 'pause'],
                        e.currentTarget.checked || undefined,
                      )}
                  />
                  {t('checks.pause')}<InfoTip text={t('checks.pauseHelp')} />
                </label>
              </div>
              <div class="conditions">
                <div class="part">
                  <span class="label"
                    >{t('checks.effects')}<InfoTip text={t('checks.effectsHelp')} /></span
                  >
                  <PairEditor
                    value={check.effects}
                    keys={Object.keys(effectHints)}
                    values={effectHints}
                    keyLabel={t('steps.pairs.key')}
                    locale={getLocale()}
                    {disabled}
                    label={t('checks.effects')}
                    onchange={(map) => doc.edit('travel-rules', ['checks', i, 'effects'], map)}
                  />
                </div>
                {#if binding}
                  <div class="part">
                    <span class="label"
                      >{t('checks.context')}<InfoTip text={t('checks.contextHelp')} /></span
                    >
                    <PairEditor
                      value={binding.context}
                      keys={Object.keys(hints)}
                      values={hints}
                      fresh=""
                      keyLabel={t('checks.contextKey')}
                      locale={getLocale()}
                      {disabled}
                      label={t('checks.context')}
                      onchange={(map) => doc.edit('bindings', ['on', event, 'context'], map)}
                    />
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/if}
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
            <th>{t('checks.statFrom')}<InfoTip text={t('checks.statFromHelp')} /></th>
            {#if system}<th>{t('uses.title')}<InfoTip text={t('uses.help')} /></th>{/if}
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
              <td class="from">
                <SuggestInput
                  label={t('checks.statFrom')}
                  placeholder={t('checks.statFromNone')}
                  value={stat?.from ? bare(stat.from) : ''}
                  suggestions={fromHints}
                  {disabled}
                  onchange={(text) => setFlow(['stats', id, 'from'], 'bindings', text)}
                />
              </td>
              {#if system}
                <td>
                  <UsedBy
                    uses={usesFor(system, { kind: 'stat', id })}
                    open={statUses === id}
                    ontoggle={() => (statUses = statUses === id ? null : id)}
                  />
                </td>
              {/if}
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
            {#if system && statUses === id}
              <tr class="uses-row">
                <td colspan="7">
                  <UsesList uses={usesFor(system, { kind: 'stat', id })} {system} />
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="help">{t('checks.noStats')}</p>
    {/if}
    {#if !disabled}<button class="add" onclick={addStat}>{t('checks.addStat')}</button>{/if}
  </section>

  <section>
    <h3>{t('checks.roles')}<InfoTip text={t('checks.rolesHelp')} /></h3>
    <RecordRows
      {doc}
      kind="bindings"
      at={['roles']}
      uses={system && { of: (id) => usesFor(system, { kind: 'role', id }), system }}
      idLabel={t('forms.id')}
      suggestions={['guide', 'lookout', 'forager', 'quartermaster']}
      columns={[
        { field: 'name', label: t('checks.roleName'), type: 'text' },
        {
          field: 'description',
          label: t('forms.description'),
          help: t('forms.descriptionHelp'),
          type: 'text',
        },
      ]}
    />
  </section>
</div>

<style>
  .said {
    font-size: 11px;
    color: var(--text-muted);
  }

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

  /* One grid for the card's fields, so every row lines up in the same two columns. */
  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px 16px;
    align-items: start;
  }

  .row,
  .conditions {
    display: contents;
  }

  /* Each row starts a line of the grid, whatever the row before it left empty. */
  .row > :first-child,
  .conditions > :first-child {
    grid-column: 1;
  }

  .part {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
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

  .row label.inline {
    flex-direction: row;
    align-self: end;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
  }

  label.inline input {
    width: auto;
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
