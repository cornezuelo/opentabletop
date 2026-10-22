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
  import { confirmAction, InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { ConditionEditor, conditionWords } from '@open-tabletop/pack-ui'
  import StepCard from './StepCard.svelte'
  import type { StepContext } from '../../lib/steps'
  import { getLocale, t } from '../../lib/i18n'
  import { dayPartRefs, partLabel } from '../../lib/dayParts'
  import { library } from '../../lib/packs.svelte'
  import { momentsText, parseMoments, type SystemDoc } from '../../lib/systemDoc.svelte'

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
  /** What a step of this action's card offers. */
  const stepContext = (id: string): StepContext => ({
    actions: ids
      .filter((a) => a !== id)
      .map((a) => ({ id: a, name: label(a), params: paramsOf(a) })),
    params: paramsOf(id),
    modes: Object.keys((doc.rules.modes ?? {}) as Raw).map((m) => ({ id: m, name: modeName(m) })),
    checks: events.map((e) => ({ event: e, name: checkName(e) })),
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
      mode: modeName,
      param: (p) => paramsOf(id).find((x) => x.id === p)?.name ?? p,
      part: (ref) => partLabel(system, ref, getLocale()),
      condition: (c) => conditionWords(c, getLocale()),
    },
  })
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

  function move(id: string, i: number, by: number) {
    const list = steps(id)
    const j = i + by
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    writeSteps(id, list)
    // The open card moves with its step.
    const a = opened.has(`${id}:${i}`)
    const b = opened.has(`${id}:${j}`)
    opened[b ? 'add' : 'delete'](`${id}:${i}`)
    opened[a ? 'add' : 'delete'](`${id}:${j}`)
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
  }

  function rename(id: string, next: string) {
    const to = next.trim()
    if (!to || to === id) return
    if (ids.includes(to)) return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename('travel-rules', ['actions'], id, to)
  }
</script>

<div class="actions">
  {#each ids as id (id)}
    {@const d = def(id)}
    <div class="action">
      <div class="row head">
        <label class="id">
          <span>{t('forms.id')}</span>
          <input
            type="text"
            value={id}
            {disabled}
            onchange={(e) => rename(id, e.currentTarget.value)}
          />
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
        {#if !disabled}
          <button
            class="icon"
            aria-label={t('forms.remove')}
            use:tooltip={t('forms.remove')}
            onclick={() => removeAction(id)}>×</button
          >
        {/if}
      </div>
      <label>
        <span>{t('forms.description')}<InfoTip text={t('forms.descriptionHelp')} /></span>
        <textarea
          rows="2"
          placeholder={doc.translating ? doc.baseText(d.description) : ''}
          value={text(id, 'description')}
          {disabled}
          onchange={(e) => setText(id, 'description', e.currentTarget.value)}></textarea>
      </label>
      <div class="row">
        <label>
          <span>{t('actions.on')}<InfoTip text={t('actions.onHelp')} /></span>
          <SuggestInput
            label={t('actions.on')}
            placeholder={t('actions.onButton')}
            value={momentsText(d.on)}
            list={[
              ...CHECK_MOMENTS,
              '06:00',
              ...parts,
              ...ids.filter((a) => a !== id).map((a) => ref('actions', a)),
            ]}
            {disabled}
            onchange={(v) => doc.edit('travel-rules', ['actions', id, 'on'], parseMoments(v))}
          />
          {#if d.on}<small class="said">{saidMoments(d.on)}</small>{/if}
        </label>
        <label class="inline">
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
      </div>
      <div class="conditions">
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
          placeholder={doc.translating ? doc.baseText(d.nothing) : t('actions.nothingPlaceholder')}
          value={text(id, 'nothing')}
          {disabled}
          onchange={(e) => setText(id, 'nothing', e.currentTarget.value)}
        />
      </label>

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
            onmove={(by) => move(id, i, by)}
            onremove={() => removeStep(id, i)}
          />
        {:else}
          <li class="muted">{t('actions.noSteps')}</li>
        {/each}
      </ol>
      {#if !disabled}
        <button class="addstep" onclick={() => addStep(id)}>{t('actions.addStep')}</button>
      {/if}
    </div>
  {/each}
  {#if !disabled}
    <button class="add" onclick={addAction}>{t('actions.add')}</button>
  {/if}
</div>

<style>
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
  label textarea {
    width: 100%;
    min-width: 0;
  }

  label textarea {
    resize: vertical;
  }

  .row label.inline,
  label.inline {
    flex: 0 0 auto;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
  }

  label.inline input {
    width: auto;
  }

  .row label.id {
    flex: 0 0 9em;
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

  .conditions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18em, 1fr));
    gap: 8px 16px;
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
