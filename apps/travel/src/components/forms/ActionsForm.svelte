<script lang="ts">
  import {
    actionSteps,
    CHECK_MOMENTS,
    type ActionDefinition,
    type ActionStep,
  } from '@open-tabletop/travel-engine'
  import { contextSuggestions, effectSuggestions } from '@open-tabletop/session'
  import { confirmAction, InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { t } from '../../lib/i18n'
  import { library } from '../../lib/packs.svelte'
  import type { SystemDoc } from '../../lib/systemDoc.svelte'

  /**
   * The party's actions as cards: camp, rest and the system's own (forage…), each with its
   * name and description, when it can be taken and what it does, step by step. Editing the
   * steps writes them as `do` (actions written with the older columns move to steps).
   */
  let { doc }: { doc: SystemDoc } = $props()

  type Raw = Record<string, unknown>
  const BUILT_IN = ['camp', 'rest'] as const
  /** Kinds of step; `do:<action>` and `roll:<check event>` name what they take or roll. */
  const KINDS = ['time', 'speed', 'effects', 'set'] as const
  type StepKind = (typeof KINDS)[number] | 'eat' | `do:${string}` | `roll:${string}`

  const disabled = $derived(!doc.editable)
  const actions = $derived((doc.rules.actions ?? {}) as Record<string, Raw | false | undefined>)
  const own = $derived(
    Object.keys(actions).filter((id) => !(BUILT_IN as readonly string[]).includes(id)),
  )
  const ids = $derived([...BUILT_IN, ...own])
  /** Actions a step can take (those the system has). */
  const live = $derived(ids.filter((id) => actions[id] !== false))
  /** Check events a step can roll. */
  const events = $derived([
    ...new Set(
      ((doc.rules.checks ?? []) as Raw[]).map((c) => String(c.event ?? '')).filter(Boolean),
    ),
  ])
  /** The values of the day a step can set. */
  const dayValues = $derived(
    Object.fromEntries(
      Object.keys((doc.rules.values ?? {}) as Raw).map((v) => [v, ['true', 'false']]),
    ),
  )
  const label = (id: string) =>
    (BUILT_IN as readonly string[]).includes(id)
      ? t(`actions.${id as 'camp' | 'rest'}`)
      : text(id, 'name') || id
  /** What conditions can read, and the paths effects can change. */
  const hints = $derived(contextSuggestions(library.registry))
  const effectHints = $derived(effectSuggestions(library.registry))
  const momentsId = $props.id()

  /** A map as `key: value` pairs, without the outer braces. */
  const bare = (value: unknown) => flowText(value).replace(/^\{\s*|\s*\}$/g, '')
  const def = (id: string): ActionDefinition | null => {
    const a = actions[id]
    if (a === false) return null
    return (a ?? {}) as ActionDefinition
  }
  const steps = (id: string): ActionStep[] => {
    const d = def(id)
    return d ? actionSteps(id, d) : []
  }
  const kindOf = (step: ActionStep): StepKind =>
    step.time !== undefined
      ? 'time'
      : step.eat !== undefined
        ? 'eat'
        : step.speed !== undefined
          ? 'speed'
          : step.do !== undefined
            ? `do:${step.do}`
            : step.roll !== undefined
              ? `roll:${step.roll}`
              : step.set !== undefined
                ? 'set'
                : 'effects'

  const text = (id: string, field: 'name' | 'description' | 'nothing') =>
    doc.text('travel-rules', def(id)?.[field], ['actions', id, field])
  const setText = (id: string, field: 'name' | 'description' | 'nothing', value: string) =>
    doc.setText(
      'travel-rules',
      ['actions', id, field],
      def(id)?.[field],
      ['actions', id, field],
      value,
    )

  function setFlow(path: (string | number)[], value: string) {
    const parsed = parseFlow(value)
    if (parsed === null) return showToast(t('forms.badFlow'), 'error')
    doc.edit('travel-rules', path, Object.keys(parsed ?? {}).length ? parsed : undefined)
  }

  /** Writes an action's steps as `do`, dropping the older columns they replace. */
  function writeSteps(id: string, next: ActionStep[]) {
    for (const key of ['minutes', 'speed', 'fatigue', 'effects'])
      if (def(id)?.[key as keyof ActionDefinition] !== undefined)
        doc.edit('travel-rules', ['actions', id, key], undefined)
    doc.edit(
      'travel-rules',
      ['actions', id, 'do'],
      next.map((s) => JSON.parse(JSON.stringify(s)) as ActionStep),
    )
  }
  const editStep = (id: string, i: number, change: (step: ActionStep) => ActionStep) =>
    writeSteps(
      id,
      steps(id).map((s, j) => (j === i ? change({ ...s }) : s)),
    )

  /** A new kind of step, with a value to start from. */
  function setKind(id: string, i: number, kind: StepKind) {
    const fresh: ActionStep = kind.startsWith('do:')
      ? { do: kind.slice(3) }
      : kind.startsWith('roll:')
        ? { roll: kind.slice(5) }
        : {
            time: { time: 60 },
            eat: { eat: 'day' as const },
            speed: { speed: 0.5 },
            effects: { effects: {} },
            set: { set: {} },
          }[kind as (typeof KINDS)[number] | 'eat']
    editStep(id, i, (s) => ({
      ...(s.when && { when: s.when }),
      ...(s.unless && { unless: s.unless }),
      ...fresh,
    }))
  }

  /** "180" (minutes), "dawn", "nightfall" or a time of day ("14:00"). */
  function setTime(id: string, i: number, raw: string) {
    const value = raw.trim()
    const time = /^\d+$/.test(value)
      ? Number(value)
      : value === 'dawn' || value === 'nightfall' || /^\d{1,2}:\d{2}$/.test(value)
        ? value
        : null
    if (time === null) return showToast(t('actions.badTime'), 'error')
    editStep(id, i, (s) => ({ ...s, time }))
  }

  function setStepFlow(
    id: string,
    i: number,
    key: 'when' | 'unless' | 'effects' | 'set',
    raw: string,
  ) {
    const parsed = parseFlow(raw)
    if (parsed === null) return showToast(t('forms.badFlow'), 'error')
    editStep(id, i, (s) => {
      const out = { ...s, [key]: parsed }
      if ((key === 'when' || key === 'unless') && !Object.keys(parsed ?? {}).length) delete out[key]
      return out
    })
  }

  function move(id: string, i: number, by: number) {
    const list = steps(id)
    const j = i + by
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    writeSteps(id, list)
  }

  async function removeAction(id: string) {
    if (!(await confirmAction(t('forms.confirmRemove', { name: text(id, 'name') || id })))) return
    doc.edit('travel-rules', ['actions', id], undefined)
  }

  function addAction() {
    const id = freeId('action', Object.keys(actions))
    doc.edit('travel-rules', ['actions', id], { do: [{ time: 60 }], oncePerDay: true })
  }

  function rename(id: string, next: string) {
    const to = next.trim()
    if (!to || to === id) return
    if (to in actions || (BUILT_IN as readonly string[]).includes(to))
      return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename('travel-rules', ['actions'], id, to)
  }
</script>

<div class="actions">
  {#each ids as id (id)}
    {@const d = def(id)}
    {@const builtIn = (BUILT_IN as readonly string[]).includes(id)}
    <div class="action" class:off={!d}>
      <div class="row head">
        {#if builtIn}
          <label class="inline">
            <input
              type="checkbox"
              checked={!!d}
              {disabled}
              onchange={(e) =>
                doc.edit(
                  'travel-rules',
                  ['actions', id],
                  e.currentTarget.checked ? undefined : false,
                )}
            />
            <strong>{t(`actions.${id as 'camp' | 'rest'}`)}</strong><InfoTip
              text={t(`actions.${id as 'camp' | 'rest'}Help`)}
            />
          </label>
        {:else}
          <label class="id">
            <span>{t('forms.id')}</span>
            <input
              type="text"
              value={id}
              {disabled}
              onchange={(e) => rename(id, e.currentTarget.value)}
            />
          </label>
        {/if}
        {#if d}
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
        {/if}
        {#if !builtIn && !disabled}
          <button
            class="icon"
            aria-label={t('forms.remove')}
            use:tooltip={t('forms.remove')}
            onclick={() => removeAction(id)}>×</button
          >
        {/if}
      </div>
      {#if d}
        <label>
          <span>{t('checks.description')}</span>
          <textarea
            rows="2"
            placeholder={doc.translating ? doc.baseText(d.description) : ''}
            value={text(id, 'description')}
            {disabled}
            onchange={(e) => setText(id, 'description', e.currentTarget.value)}></textarea>
        </label>
        <div class="row">
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
        </div>
        <label>
          <span>{t('actions.on')}<InfoTip text={t('actions.onHelp')} /></span>
          <select
            value={d.on ?? ''}
            {disabled}
            onchange={(e) =>
              doc.edit('travel-rules', ['actions', id, 'on'], e.currentTarget.value || undefined)}
          >
            <option value="">{t('actions.onButton')}</option>
            {#each CHECK_MOMENTS as m (m)}<option value={m}>{t(`checks.atOptions.${m}`)}</option
              >{/each}
            {#each live.filter((a) => a !== id && a !== 'camp') as a (a)}<option value={a}
                >{t('actions.onAfter', { action: label(a) })}</option
              >{/each}
          </select>
        </label>
        {#if !builtIn}
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
        {/if}

        <h4>{t('actions.steps')}<InfoTip text={t('actions.stepsHelp')} /></h4>
        <ol class="steps">
          {#each steps(id) as step, i (i)}
            {@const kind = kindOf(step)}
            <li class="step">
              <select
                value={kind}
                {disabled}
                aria-label={t('actions.stepKind')}
                onchange={(e) => setKind(id, i, e.currentTarget.value as StepKind)}
              >
                {#each KINDS as k (k)}<option value={k}>{t(`actions.kinds.${k}`)}</option>{/each}
                {#if kind === 'eat'}<option value="eat">{t('actions.kinds.eat')}</option>{/if}
                <optgroup label={t('actions.kinds.do')}>
                  {#each live.filter((a) => a !== id) as a (a)}<option value={`do:${a}`}
                      >{t('actions.doOption', { action: label(a) })}</option
                    >{/each}
                </optgroup>
                {#if events.length}
                  <optgroup label={t('actions.kinds.roll')}>
                    {#each events as ev (ev)}<option value={`roll:${ev}`}
                        >{t('actions.rollOption', { check: ev })}</option
                      >{/each}
                  </optgroup>
                {/if}
              </select>
              {#if kind === 'time'}
                <input
                  class="value"
                  type="text"
                  list={momentsId}
                  aria-label={t('actions.kinds.time')}
                  value={String(step.time)}
                  {disabled}
                  onchange={(e) => setTime(id, i, e.currentTarget.value)}
                />
              {:else if kind === 'speed'}
                <input
                  class="value"
                  type="number"
                  min="0"
                  step="any"
                  aria-label={t('actions.kinds.speed')}
                  value={step.speed}
                  {disabled}
                  onchange={(e) =>
                    editStep(id, i, (s) => ({ ...s, speed: Number(e.currentTarget.value) || 0 }))}
                />
              {:else if kind === 'effects'}
                <div class="value">
                  <SuggestInput
                    label={t('actions.kinds.effects')}
                    placeholder="party.stats.fatigue: -1"
                    value={bare(step.effects)}
                    suggestions={effectHints}
                    {disabled}
                    onchange={(v) => setStepFlow(id, i, 'effects', v)}
                  />
                </div>
              {:else if kind === 'set'}
                <div class="value">
                  <SuggestInput
                    label={t('actions.kinds.set')}
                    placeholder="lost: true"
                    value={bare(step.set)}
                    suggestions={dayValues}
                    {disabled}
                    onchange={(v) => setStepFlow(id, i, 'set', v)}
                  />
                </div>
              {:else if kind === 'eat'}
                <span class="value muted">{t('actions.eatDay')}</span>
              {:else}
                <span class="value"></span>
              {/if}
              <div class="cond">
                <SuggestInput
                  label={t('actions.stepWhen')}
                  placeholder={t('actions.stepWhen')}
                  value={bare(step.when)}
                  suggestions={{ ...hints, camping: ['true', 'false'] }}
                  {disabled}
                  onchange={(v) => setStepFlow(id, i, 'when', v)}
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
      {/if}
    </div>
  {/each}
  {#if !disabled}
    <button class="add" onclick={addAction}>{t('actions.add')}</button>
  {/if}
  <datalist id={momentsId}>
    <option value="60"></option>
    <option value="120"></option>
    <option value="180"></option>
    <option value="dawn">{t('actions.dawn')}</option>
    <option value="nightfall">{t('actions.nightfall')}</option>
  </datalist>
</div>

<style>
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

  .action.off {
    opacity: 0.7;
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

  .head strong {
    color: var(--text);
    font-size: 13px;
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
