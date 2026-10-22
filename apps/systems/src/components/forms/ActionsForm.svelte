<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import {
    actionSteps,
    CHECK_MOMENTS,
    DAY_END,
    HEX_ENTER,
    ref,
    refId,
    isClock,
    isPartRef,
    type ActionDefinition,
    type ActionStep,
  } from '@open-tabletop/travel-engine'
  import { contextSuggestions, effectSuggestions, type TravelSystem } from '@open-tabletop/session'
  import {
    confirmAction,
    InfoTip,
    showToast,
    SuggestInput,
    TagInput,
    tooltip,
  } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { ConditionEditor, conditionWords } from '@open-tabletop/pack-ui'
  import StepCard from './StepCard.svelte'
  import { memberNamer, translator } from '@open-tabletop/travel-ui'
  import type { CharacterState } from '@open-tabletop/character-engine'
  import { actionLine, actionReading, type StepContext } from '../../lib/steps'
  import { matches } from '../../lib/search'
  import CardHead from './CardHead.svelte'
  import UsedBy from '../uses/UsedBy.svelte'
  import UsesList from '../uses/UsesList.svelte'
  import { usesFor } from '../../lib/usage'
  import CardTools from './CardTools.svelte'
  import { getLocale, t } from '../../lib/i18n'
  import { dayPartRefs, partLabel } from '../../lib/dayParts'
  import { clockMoments, clockOfMoment } from '../../lib/worldMoments'
  import { library } from '../../lib/packs.svelte'
  import {
    momentsList,
    momentsText,
    writeMoments,
    type SystemDoc,
  } from '../../lib/systemDoc.svelte'

  /**
   * The system's actions as cards, all alike (camp and rest too): id, name and description,
   * when they can be taken (conditions as rows), who takes them (the player, or the system at
   * a moment) and what they do, each step a card of its own (`StepCard`). Editing the steps
   * writes them as `do`.
   */
  let { doc, system }: { doc: SystemDoc; system?: TravelSystem } = $props()
  /** The parts of its calendar's day: moments and time steps may name them. */
  const parts = $derived(dayPartRefs(system))

  type Raw = Record<string, unknown>
  const disabled = $derived(!doc.editable)
  const actions = $derived((doc.rules.actions ?? {}) as Record<string, Raw | undefined>)
  /** Every action the system declares, in order. */
  const ids = $derived(Object.keys(actions))
  /** An action's moments in words: "At dawn · After: Camp". */
  const saidMoments = (on: unknown) =>
    momentsText(on)
      .split(', ')
      .map((m) =>
        m === HEX_ENTER
          ? t('checks.atOptions.hex-enter')
          : m === DAY_END
            ? t('checks.atOptions.day-end')
            : isClock(m)
              ? t('checks.atClock', { clock: m })
              : isPartRef(m)
                ? t('checks.atPart', { part: partLabel(system, m, getLocale()) })
                : refId('actions', m)
                  ? t('actions.onAfter', { action: label(refId('actions', m)!) })
                  : clockOfMoment(system, m, getLocale())
                    ? t('checks.atFull', { clock: clockOfMoment(system, m, getLocale())! })
                    : m,
      )
      .join(' · ')
  /** Check events a step can roll. */
  const events = $derived([
    ...new Set(
      ((doc.rules.checks ?? []) as Raw[]).map((c) => String(c.event ?? '')).filter(Boolean),
    ),
  ])
  const label = (id: string) => text(id, 'name') || id
  /** What conditions can read. */
  const hints = $derived(contextSuggestions(library.registry))
  /** Its parameters, each with its choices as written (`hex`, `3`). */
  const paramsOf = (id: string) =>
    Object.entries(def(id).params ?? {}).map(([p, d]) => ({
      id: p,
      name: doc.text('travel-rules', d.name, ['actions', id, 'params', p, 'name']) || p,
      choices: d.choices.map((c) => String(typeof c === 'object' ? c.id : c)),
    }))
  const checkName = (event: string) => {
    const check = ((doc.rules.checks ?? []) as Raw[]).find((c) => c.event === event)
    return (check && doc.text('travel-rules', check.name, ['checks', event, 'name'])) || event
  }
  const modeName = (m: string) =>
    doc.text('travel-rules', ((doc.rules.modes ?? {}) as Record<string, Raw>)[m]?.name, [
      'modes',
      m,
      'name',
    ]) || m
  const effectKeys = $derived(Object.keys(effectSuggestions(library.registry)))
  /**
   * The characters' and the world's paths named as the trip's journal names them ("Everyone:
   * Dread", a faction's value), with one member standing for any, so theirs are named too.
   */
  const memberName = $derived(
    system &&
      memberNamer(
        system,
        [{ id: '' } as CharacterState],
        getLocale(),
        translator(() => getLocale()),
        { factions: true, clocks: true },
      ),
  )
  /** What a change's path names: a party stat or supply by the system's name, a character's value. */
  const changeName = (path: string) => {
    const [, part, id] = /^party\.(stats|resources)\.(.+)$/.exec(path) ?? []
    if (part === 'stats') {
      const stat = ((doc.bindings?.stats ?? {}) as Record<string, Raw>)[id]
      return doc.text('bindings', stat?.name, ['stats', id, 'name']) || id
    }
    if (part === 'resources') {
      const supply = ((doc.rules.resources ?? {}) as Record<string, Raw>)[id]
      return doc.text('travel-rules', supply?.name, ['resources', id, 'name']) || id
    }
    return memberName?.(path) ?? path
  }
  /** What the Oracle rolls, as the rules name it (`table.ruins`): the same as checks roll on. */
  const rollables = $derived(doc.targets.map((x) => ({ ref: x.ref, name: x.name })))
  /** What a step of this action's card offers. */
  const stepContext = (id: string): StepContext => ({
    actions: ids
      .filter((a) => a !== id)
      .map((a) => ({ id: a, name: label(a), params: paramsOf(a) })),
    params: paramsOf(id),
    modes: Object.keys((doc.rules.modes ?? {}) as Raw).map((m) => ({ id: m, name: modeName(m) })),
    checks: events.map((e) => ({ event: e, name: checkName(e) })),
    rollables,
    values: Object.keys((doc.rules.values ?? {}) as Raw),
    effectKeys,
    times: ['60', '120', '180', '14:00', ...parts],
    conditions: {
      ...hints,
      'trip.doing': ids,
      'trip.below': [],
      'trip.above': [],
      ...Object.fromEntries(paramsOf(id).map((p) => [`params.${p.id}`, p.choices])),
    },
    names: {
      action: label,
      check: checkName,
      rolled: (r) => rollables.find((x) => x.ref === r)?.name ?? r,
      mode: modeName,
      param: (p) => paramsOf(id).find((x) => x.id === p)?.name ?? p,
      part: (ref) => partLabel(system, ref, getLocale()),
      condition: (c) => conditionWords(c, getLocale()),
      change: changeName,
    },
  })
  /** The actions shown unfolded (folded by default: the list can be long). */
  const unfolded = new SvelteSet<string>()
  let query = $state('')
  /** An action in words, folded: who takes it, then its first steps. */
  const summary = (id: string) =>
    actionLine(def(id), stepContext(id).names, {
      moments: def(id).on ? saidMoments(def(id).on) : '',
    })
  /** The whole action in words, as its open card's lead. */
  const reading = (id: string) =>
    actionReading(def(id), stepContext(id).names, {
      moments: def(id).on ? saidMoments(def(id).on) : '',
      params: paramsOf(id).map((p) => p.name),
    })
  const visible = $derived(
    ids.filter((id) =>
      matches(query, [id, label(id), text(id, 'description'), summary(id), actions[id]]),
    ),
  )

  /** The action whose uses are shown in its card. */
  let usesOpen = $state<string | null>(null)

  /** The step cards shown open, as `<action>:<index>`. */
  const opened = new SvelteSet<string>()
  function toggle(key: string) {
    if (!opened.delete(key)) opened.add(key)
  }

  /** A map as `key: value` pairs, without the outer braces. */
  const bare = (value: unknown) => flowText(value).replace(/^\{\s*|\s*\}$/g, '')
  const def = (id: string): ActionDefinition => (actions[id] as ActionDefinition | undefined) ?? {}
  const steps = (id: string): ActionStep[] => actionSteps(def(id))

  const text = (id: string, field: 'name' | 'description' | 'nothing') =>
    doc.text('travel-rules', def(id)[field], ['actions', id, field])
  const setText = (id: string, field: 'name' | 'description' | 'nothing', value: string) =>
    doc.setText(
      'travel-rules',
      ['actions', id, field],
      def(id)[field],
      ['actions', id, field],
      value,
    )

  function setFlow(path: (string | number)[], value: string) {
    const parsed = parseFlow(value)
    if (parsed === null) return showToast(t('forms.badFlow'), 'error')
    doc.edit('travel-rules', path, Object.keys(parsed ?? {}).length ? parsed : undefined)
  }

  /** Writes an action's steps as `do`. */
  function writeSteps(id: string, next: ActionStep[]) {
    doc.edit(
      'travel-rules',
      ['actions', id, 'do'],
      next.map((s) => JSON.parse(JSON.stringify(s)) as ActionStep),
    )
  }

  /** Moves a step to another place in its action; the cards shown open move with theirs. */
  function moveTo(id: string, from: number, to: number) {
    const list = steps(id)
    if (from === to || to < 0 || to >= list.length) return
    const order = list.map((_, k) => k)
    order.splice(to, 0, ...order.splice(from, 1))
    writeSteps(
      id,
      order.map((k) => list[k]),
    )
    const wasOpen = order.map((k) => opened.has(`${id}:${k}`))
    wasOpen.forEach((open, k) => opened[open ? 'add' : 'delete'](`${id}:${k}`))
  }

  function addStep(id: string) {
    opened.add(`${id}:${steps(id).length}`)
    writeSteps(id, [...steps(id), { time: 60 }])
  }

  function removeStep(id: string, i: number) {
    writeSteps(
      id,
      steps(id).filter((_, j) => j !== i),
    )
    // Cards after it move up one.
    const kept = [...opened].flatMap((key) => {
      const at = key.lastIndexOf(':')
      const [a, n] = [key.slice(0, at), Number(key.slice(at + 1))]
      if (a !== id || n < i) return [key]
      return n === i ? [] : [`${a}:${n - 1}`]
    })
    opened.clear()
    for (const key of kept) opened.add(key)
  }

  async function removeAction(id: string) {
    if (!(await confirmAction(t('forms.confirmRemove', { name: label(id) })))) return
    doc.edit('travel-rules', ['actions', id], undefined)
  }

  function addAction() {
    const id = freeId('action', Object.keys(actions))
    doc.edit('travel-rules', ['actions', id], { do: [{ time: 60 }] })
    query = ''
    unfolded.add(id)
  }

  function rename(id: string, next: string) {
    const to = next.trim()
    if (!to || to === id) return
    if (ids.includes(to)) return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename('travel-rules', ['actions'], id, to)
    if (unfolded.delete(id)) unfolded.add(to)
  }
</script>

<div class="actions">
  {#if ids.length > 1}
    <CardTools
      bind:query
      shown={visible.length}
      total={ids.length}
      label={t('actions.search')}
      onopenall={() => visible.forEach((id) => unfolded.add(id))}
      oncloseall={() => unfolded.clear()}
    />
  {/if}
  {#each visible as id (id)}
    {@const d = def(id)}
    {@const open = unfolded.has(id)}
    <div class="action">
      <CardHead
        title={label(id)}
        {id}
        said={open ? undefined : summary(id)}
        {open}
        ontoggle={() => (open ? unfolded.delete(id) : unfolded.add(id))}
      >
        {#if !disabled}
          <button
            class="icon"
            aria-label={t('forms.remove')}
            use:tooltip={t('forms.remove')}
            onclick={() => removeAction(id)}>×</button
          >
        {/if}
      </CardHead>
      {#if open}
        {@const words = reading(id)}
        <div class="reading">
          <p>{words.lead}</p>
          {#if words.when}<p><strong>{t('actions.when')}:</strong> {words.when}</p>{/if}
          {#if words.unless}<p><strong>{t('actions.unless')}:</strong> {words.unless}</p>{/if}
        </div>
        <div class="fields">
          <label>
            <span>{t('forms.id')}</span>
            <input
              type="text"
              value={id}
              {disabled}
              onchange={(e) => rename(id, e.currentTarget.value)}
            />
          </label>
          <label>
            <span>{t('actions.on')}<InfoTip text={t('actions.onHelp')} /></span>
            <TagInput
              label={t('actions.on')}
              placeholder={t('actions.onButton')}
              value={momentsList(d.on)}
              choices={[
                ...CHECK_MOMENTS,
                '06:00',
                ...parts,
                ...ids.filter((a) => a !== id).map((a) => ref('actions', a)),
                ...clockMoments(system),
              ]}
              removeLabel={t('forms.removeItem')}
              {disabled}
              onchange={(v) => doc.edit('travel-rules', ['actions', id, 'on'], writeMoments(v))}
            />
            {#if d.on}<small class="said">{saidMoments(d.on)}</small>{/if}
          </label>
          <label>
            <span>{t('rules.name')}<InfoTip text={t('rules.nameHelp')} /></span>
            <input
              type="text"
              placeholder={doc.translating ? doc.baseText(d.name) : ''}
              value={text(id, 'name')}
              {disabled}
              onchange={(e) => setText(id, 'name', e.currentTarget.value)}
            />
          </label>
          <label>
            <span>{t('forms.description')}<InfoTip text={t('forms.descriptionHelp')} /></span>
            <textarea
              rows="2"
              placeholder={doc.translating ? doc.baseText(d.description) : ''}
              value={text(id, 'description')}
              {disabled}
              onchange={(e) => setText(id, 'description', e.currentTarget.value)}></textarea>
          </label>
          <div class="cond">
            <span class="label">{t('actions.when')}<InfoTip text={t('actions.whenHelp')} /></span>
            <ConditionEditor
              value={d.when}
              suggestions={hints}
              locale={getLocale()}
              {disabled}
              label={t('actions.when')}
              onchange={(c) => doc.edit('travel-rules', ['actions', id, 'when'], c)}
            />
          </div>
          <div class="cond">
            <span class="label">{t('actions.unless')}<InfoTip text={t('actions.whenHelp')} /></span>
            <ConditionEditor
              value={d.unless}
              suggestions={hints}
              locale={getLocale()}
              {disabled}
              label={t('actions.unless')}
              onchange={(c) => doc.edit('travel-rules', ['actions', id, 'unless'], c)}
            />
          </div>
          <label>
            <span>{t('actions.params')}<InfoTip text={t('actions.paramsHelp')} /></span>
            <SuggestInput
              label={t('actions.params')}
              placeholder={t('actions.noParams')}
              value={bare(d.params)}
              {disabled}
              onchange={(v) => setFlow(['actions', id, 'params'], v)}
            />
          </label>
          <label>
            <span>{t('actions.nothing')}<InfoTip text={t('actions.nothingHelp')} /></span>
            <input
              type="text"
              placeholder={doc.translating
                ? doc.baseText(d.nothing)
                : t('actions.nothingPlaceholder')}
              value={text(id, 'nothing')}
              {disabled}
              onchange={(e) => setText(id, 'nothing', e.currentTarget.value)}
            />
          </label>
          <label class="inline first">
            <input
              type="checkbox"
              checked={d.oncePerDay === true}
              {disabled}
              onchange={(e) =>
                doc.edit(
                  'travel-rules',
                  ['actions', id, 'oncePerDay'],
                  e.currentTarget.checked || undefined,
                )}
            />
            {t('rules.oncePerDay')}
          </label>
          <label class="inline">
            <input
              type="checkbox"
              checked={d.hideWhenUnavailable === true}
              {disabled}
              onchange={(e) =>
                doc.edit(
                  'travel-rules',
                  ['actions', id, 'hideWhenUnavailable'],
                  e.currentTarget.checked || undefined,
                )}
            />
            <span>{t('actions.hide')}<InfoTip text={t('actions.hideHelp')} /></span>
          </label>
          {#if system}
            {@const uses = usesFor(system, { kind: 'action', id })}
            <div class="cond">
              <span class="label">{t('uses.title')}<InfoTip text={t('uses.help')} /></span>
              <UsedBy
                {uses}
                open={usesOpen === id}
                ontoggle={() => (usesOpen = usesOpen === id ? null : id)}
              />
            </div>
            {#if usesOpen === id}
              <div class="wide"><UsesList {uses} {system} /></div>
            {/if}
          {/if}
        </div>

        <h4>{t('actions.steps')}<InfoTip text={t('actions.stepsHelp')} /></h4>
        <ol class="steps">
          {#each steps(id) as step, i (i)}
            <StepCard
              {step}
              index={i}
              count={steps(id).length}
              ctx={stepContext(id)}
              {disabled}
              open={opened.has(`${id}:${i}`)}
              ontoggle={() => toggle(`${id}:${i}`)}
              onchange={(next) =>
                writeSteps(
                  id,
                  steps(id).map((s, j) => (j === i ? next : s)),
                )}
              onmove={(by) => moveTo(id, i, i + by)}
              ondropstep={(from) => moveTo(id, from, i)}
              onremove={() => removeStep(id, i)}
            />
          {:else}
            <li class="muted">{t('actions.noSteps')}</li>
          {/each}
        </ol>
        {#if !disabled}
          <button class="addstep" onclick={() => addStep(id)}>{t('actions.addStep')}</button>
        {/if}
      {/if}
    </div>
  {/each}
  {#if !disabled}
    <button class="add" onclick={addAction}>{t('actions.add')}</button>
  {/if}
</div>

<style>
  .reading p {
    margin: 0;
  }

  .reading {
    margin: 0;
    padding: 6px 8px;
    font-size: 12px;
    line-height: 1.45;
    background: var(--bg);
    border-left: 3px solid var(--accent);
    border-radius: 3px;
  }

  .said {
    font-size: 11px;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .action {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  /* The same two columns as a check's card: id · moment, name · description… */
  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px 16px;
    align-items: start;
  }

  .fields > .first {
    grid-column: 1;
  }

  .fields > .wide {
    grid-column: 1 / -1;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  label input,
  label textarea {
    width: 100%;
    min-width: 0;
  }

  label textarea {
    resize: vertical;
  }

  label.inline {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
  }

  label.inline input {
    width: auto;
  }

  h4 {
    margin: 6px 0 0;
    font-size: 12px;
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .cond {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .addstep {
    align-self: flex-start;
  }

  .muted {
    color: var(--text-muted);
    font-size: 12px;
  }

  .add {
    align-self: flex-start;
  }
</style>
