<script lang="ts">
  import {
    actionSteps,
    CHECK_MOMENTS,
    isClock,
    isPartRef,
    STEP_KINDS,
    type ActionDefinition,
    type ActionStep,
  } from '@open-tabletop/travel-engine'
  import { contextSuggestions, effectSuggestions, type TravelSystem } from '@open-tabletop/session'
  import { confirmAction, InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { getLocale, t } from '../../lib/i18n'
  import { dayPartRefs, partLabel } from '../../lib/dayParts'
  import { library } from '../../lib/packs.svelte'
  import { momentsText, parseMoments, type SystemDoc } from '../../lib/systemDoc.svelte'

  /**
   * The system's actions as cards, all alike (camp and rest too): id, name and description,
   * when they can be taken, who takes them (the player, or the system at a moment) and what
   * they do, step by step, each step written in the pack's own syntax (`time: 180`,
   * `do: forage`) with suggestions. Editing the steps writes them as `do`.
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
        (CHECK_MOMENTS as readonly string[]).includes(m)
          ? t(`checks.atOptions.${m as (typeof CHECK_MOMENTS)[number]}`)
          : isClock(m)
            ? t('checks.atClock', { clock: m })
            : isPartRef(m)
              ? t('checks.atPart', { part: partLabel(system, m, getLocale()) })
              : t('actions.onAfter', { action: label(m) }),
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
  /** What a step can say: its keys, and the values each one takes here. */
  const stepHints = $derived({
    time: ['60', '120', '180', '14:00', ...parts],
    'travel.move': ['destination', 'hex', '3', "'{{params.until}}'"],
    'travel.speed': ['0.5', '1.5', '0'],
    'travel.advance': ['1', '2', "'{{party.stats.rank}}'"],
    effects: [],
    'effects.*': Object.keys(effectSuggestions(library.registry)),
    set: [],
    'set.*': Object.keys((doc.rules.values ?? {}) as Raw),
    do: ids,
    roll: events,
    with: [],
    unless: [],
  })

  /** A map as `key: value` pairs, without the outer braces. */
  const bare = (value: unknown) => flowText(value).replace(/^\{\s*|\s*\}$/g, '')
  const def = (id: string): ActionDefinition => (actions[id] as ActionDefinition | undefined) ?? {}
  const steps = (id: string): ActionStep[] => actionSteps(def(id))
  /** A step as the pack writes it, but its `when` (it has its own box). */
  const stepText = (step: ActionStep) => {
    const rest = { ...step }
    delete rest.when
    return bare(rest)
  }

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

  /**
   * A step written in the box: one thing it does (and maybe `unless`, and a `do:`'s `with:`),
   * keeping its `when`.
   */
  function setStep(id: string, i: number, raw: string) {
    const parsed = parseFlow(raw) as Raw | null
    const does = Object.keys(parsed ?? {}).filter((k) => k !== 'unless' && k !== 'with')
    if (
      !parsed ||
      does.length !== 1 ||
      !(STEP_KINDS as readonly string[]).includes(does[0]) ||
      ('with' in parsed && does[0] !== 'do')
    )
      return showToast(t('actions.badStep'), 'error')
    const when = steps(id)[i]?.when
    writeSteps(
      id,
      steps(id).map((s, j) => (j === i ? ({ ...(when && { when }), ...parsed } as ActionStep) : s)),
    )
  }

  function setWhen(id: string, i: number, raw: string) {
    const parsed = parseFlow(raw)
    if (parsed === null) return showToast(t('forms.badFlow'), 'error')
    writeSteps(
      id,
      steps(id).map((s, j) => {
        if (j !== i) return s
        const rest = { ...s }
        delete rest.when
        return (Object.keys(parsed ?? {}).length ? { when: parsed, ...rest } : rest) as ActionStep
      }),
    )
  }

  function move(id: string, i: number, by: number) {
    const list = steps(id)
    const j = i + by
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    writeSteps(id, list)
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
            list={[...CHECK_MOMENTS, '06:00', ...parts, ...ids.filter((a) => a !== id)]}
            {disabled}
            onchange={(v) => doc.edit('travel-rules', ['actions', id, 'on'], parseMoments(v))}
          />
          {#if d.on}<small class="said">{saidMoments(d.on)}</small>{/if}
        </label>
        <label>
          <span>{t('actions.when')}<InfoTip text={t('actions.whenHelp')} /></span>
          <SuggestInput
            placeholder={t('checks.always')}
            value={bare(d.when)}
            suggestions={hints}
            {disabled}
            onchange={(v) => setFlow(['actions', id, 'when'], v)}
          />
        </label>
        <label>
          <span>{t('actions.unless')}<InfoTip text={t('actions.whenHelp')} /></span>
          <SuggestInput
            placeholder={t('checks.never')}
            value={bare(d.unless)}
            suggestions={hints}
            {disabled}
            onchange={(v) => setFlow(['actions', id, 'unless'], v)}
          />
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
          <li class="step">
            <div class="value">
              <SuggestInput
                label={t('actions.step')}
                placeholder="time: 180"
                value={stepText(step)}
                suggestions={stepHints}
                {disabled}
                onchange={(v) => setStep(id, i, v)}
              />
            </div>
            <div class="cond">
              <SuggestInput
                label={t('actions.stepWhen')}
                placeholder={t('actions.stepWhen')}
                value={bare(step.when)}
                suggestions={{ ...hints, doing: ids }}
                {disabled}
                onchange={(v) => setWhen(id, i, v)}
              />
            </div>
            {#if !disabled}
              <span class="buttons">
                <button
                  class="icon"
                  aria-label={t('actions.up')}
                  use:tooltip={t('actions.up')}
                  disabled={i === 0}
                  onclick={() => move(id, i, -1)}>↑</button
                >
                <button
                  class="icon"
                  aria-label={t('actions.down')}
                  use:tooltip={t('actions.down')}
                  disabled={i === steps(id).length - 1}
                  onclick={() => move(id, i, 1)}>↓</button
                >
                <button
                  class="icon"
                  aria-label={t('forms.remove')}
                  use:tooltip={t('forms.remove')}
                  onclick={() =>
                    writeSteps(
                      id,
                      steps(id).filter((_, j) => j !== i),
                    )}>×</button
                >
              </span>
            {/if}
          </li>
        {:else}
          <li class="muted">{t('actions.noSteps')}</li>
        {/each}
      </ol>
      {#if !disabled}
        <button onclick={() => writeSteps(id, [...steps(id), { time: 60 }])}
          >{t('actions.addStep')}</button
        >
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
    padding-left: 1.4em;
  }

  .step {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }

  .step .value {
    flex: 1 1 10em;
    min-width: 0;
  }

  .step .cond {
    flex: 1 1 10em;
    min-width: 0;
  }

  .buttons {
    display: flex;
    gap: 2px;
  }

  .muted {
    color: var(--text-muted);
    font-size: 12px;
  }

  .add {
    align-self: flex-start;
  }
</style>
