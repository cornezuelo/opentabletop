<script lang="ts">
  import { STEP_KINDS, WORLD_DO_TURN, type ActionStep } from '@open-tabletop/travel-engine'
  import { InfoTip, showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import {
    ConditionEditor,
    conditionWords,
    PairEditor,
    readValue,
    valueText,
  } from '@open-tabletop/pack-ui'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { getLocale, t } from '../../lib/i18n'
  import type { en } from '../../lib/i18n/en'
  import {
    kindValue,
    stepKind,
    stepSummary,
    withKind,
    type StepContext,
    type StepKind,
  } from '../../lib/steps'

  /**
   * One step of an action as a card: folded, what it does in words (and its condition);
   * open, a choice of what it does, that kind's own fields, its **Only when** / **Not when**
   * as rows, and the step as YAML one click away.
   */
  let {
    step,
    index,
    count,
    ctx,
    disabled = false,
    open,
    ontoggle,
    onchange,
    onmove,
    ondropstep,
    onremove,
  }: {
    step: ActionStep
    index: number
    count: number
    ctx: StepContext
    disabled?: boolean
    open: boolean
    ontoggle: () => void
    onchange: (step: ActionStep) => void
    onmove: (by: number) => void
    /** Another step of the same action dropped on this one, by its index. */
    ondropstep: (from: number) => void
    onremove: () => void
  } = $props()

  type Raw = Record<string, unknown>
  type KindKey = keyof (typeof en)['steps']['kinds']
  let yaml = $state(false)
  /** Another step dragged over this card. */
  let over = $state(false)
  /** Steps are dragged by their handle, between the cards of one action. */
  const DRAG = 'application/x-opentabletop-step'
  function dragStart(e: DragEvent) {
    e.dataTransfer?.setData(DRAG, String(index))
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }
  function dragOver(e: DragEvent) {
    if (disabled || !e.dataTransfer?.types.includes(DRAG)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    over = true
  }
  function drop(e: DragEvent) {
    over = false
    const from = Number(e.dataTransfer?.getData(DRAG))
    if (disabled || !e.dataTransfer?.types.includes(DRAG) || !Number.isInteger(from)) return
    e.preventDefault()
    if (from !== index) ondropstep(from)
  }
  const s = $derived(step as Raw)
  const kind = $derived(stepKind(step))
  const value = $derived(kind && s[kind])
  const locale = $derived(getLocale())
  const bare = (v: unknown) => flowText(v).replace(/^\{\s*|\s*\}$/g, '')
  const said = $derived(stepSummary(step, ctx.names))
  const cond = $derived(
    [
      step.when && t('steps.onlyWhen', { condition: conditionWords(step.when, locale) }),
      step.unless && t('steps.notWhen', { condition: conditionWords(step.unless, locale) }),
    ]
      .filter(Boolean)
      .join(' · '),
  )

  /** The step with one key changed (undefined removes it). */
  function put(key: string, v: unknown) {
    const next: Raw = { ...s }
    if (v === undefined) delete next[key]
    else next[key] = v
    onchange(next as ActionStep)
  }

  /** A box's text as a step's value: a number, or the text (a variable, a clock…). */
  const typed = (text: string) => readValue(text)

  /** What a step written as YAML must be: one thing it does, with what goes with it. */
  function setYaml(raw: string) {
    const parsed = parseFlow(raw) as Raw | null
    const does = Object.keys(parsed ?? {}).filter((k) =>
      (STEP_KINDS as readonly string[]).includes(k),
    )
    if (
      !parsed ||
      does.length !== 1 ||
      ('with' in parsed && does[0] !== 'do') ||
      'limit' in parsed !== (does[0] === 'wait')
    )
      return showToast(t('actions.badStep'), 'error')
    onchange(parsed as ActionStep)
  }

  /** The pairs of a `do:`'s parameters. */
  const pairs = (v: unknown) =>
    Object.entries(typeof v === 'object' && v !== null ? (v as Raw) : {})
  const doTarget = $derived(
    kind === 'do' ? ctx.actions.find((a) => `actions.${a.id}` === value) : undefined,
  )
  /** A `do:`'s parameter given (or left to its default). */
  function setWith(param: string, choice: string) {
    const next = Object.fromEntries(pairs(s.with))
    if (choice === '') delete next[param]
    else next[param] = typed(choice)
    put('with', Object.keys(next).length ? next : undefined)
  }
  /** A kind as the dictionaries key it (`travel.move` → `travel-move`). */
  const key = (k: StepKind) => k.replace('.', '-') as KindKey
  const label = (k: StepKind) => t(`steps.kinds.${key(k)}`)
</script>

<li
  class="card"
  class:open
  class:over
  ondragover={dragOver}
  ondragleave={() => (over = false)}
  ondrop={drop}
>
  <div class="head">
    {#if !disabled}
      <span
        class="grip"
        role="button"
        tabindex="-1"
        aria-label={t('steps.drag')}
        draggable="true"
        ondragstart={dragStart}
        use:tooltip={t('steps.drag')}>⠿</span
      >
    {/if}
    <button
      class="title"
      aria-expanded={open}
      use:tooltip={open ? t('steps.close') : t('steps.open')}
      onclick={ontoggle}
    >
      <span class="arrow">{open ? '▾' : '▸'}</span>
      <span class="said">{said}</span>
      {#if cond}<small class="cond">{cond}</small>{/if}
    </button>
    <span class="buttons">
      {#if open && kind}
        <button
          class="icon yaml"
          class:on={yaml}
          aria-pressed={yaml}
          aria-label={yaml ? t('steps.form') : t('steps.yaml')}
          use:tooltip={yaml ? t('steps.form') : t('steps.yaml')}
          onclick={() => (yaml = !yaml)}>YAML</button
        >
      {/if}
      {#if !disabled}
        <button
          class="icon"
          aria-label={t('actions.up')}
          use:tooltip={t('actions.up')}
          disabled={index === 0}
          onclick={() => onmove(-1)}>↑</button
        >
        <button
          class="icon"
          aria-label={t('actions.down')}
          use:tooltip={t('actions.down')}
          disabled={index === count - 1}
          onclick={() => onmove(1)}>↓</button
        >
        <button
          class="icon"
          aria-label={t('forms.remove')}
          use:tooltip={t('forms.remove')}
          onclick={onremove}>×</button
        >
      {/if}
    </span>
  </div>

  {#if open}
    <div class="body">
      {#if yaml || !kind}
        <SuggestInput label={t('actions.step')} value={bare(step)} {disabled} onchange={setYaml} />
        {#if !kind}<small class="muted">{t('steps.unknown')}</small>{/if}
      {:else}
        <div class="fields">
          <label class="kind">
            <span>{t('steps.kind')}<InfoTip text={t('steps.kindHelp')} /></span>
            <select
              value={kind}
              {disabled}
              onchange={(e) => {
                const k = e.currentTarget.value as StepKind
                onchange(withKind(step, k, kindValue(k, ctx)))
              }}
            >
              {#each STEP_KINDS as k (k)}<option value={k}>{label(k)}</option>{/each}
            </select>
          </label>

          {#if kind === 'time' || kind === 'travel.move' || kind === 'travel.speed' || kind === 'travel.advance' || kind === 'travel.mode'}
            <label class="grow">
              <span
                >{t(`steps.fields.${key(kind)}`)}<InfoTip
                  text={t(`steps.help.${key(kind)}`)}
                /></span
              >
              <SuggestInput
                label={t(`steps.fields.${key(kind)}`)}
                value={valueText(value)}
                list={kind === 'time'
                  ? ctx.times
                  : kind === 'travel.move'
                    ? ['destination', 'place', '3', ...ctx.params.map((p) => `{{params.${p.id}}}`)]
                    : kind === 'travel.speed'
                      ? ['0.5', '1.5', '0']
                      : kind === 'travel.advance'
                        ? ['1', '2']
                        : [
                            ...ctx.modes.map((m) => `modes.${m.id}`),
                            ...ctx.params.map((p) => `{{params.${p.id}}}`),
                          ]}
                {disabled}
                onchange={(v) => put(kind, typed(v))}
              />
            </label>
          {:else if kind === 'do' || kind === 'roll' || kind === 'ask'}
            {@const options =
              kind === 'do'
                ? [
                    ...ctx.actions.map((a) => ({ id: `actions.${a.id}`, name: a.name })),
                    { id: WORLD_DO_TURN, name: t('worldForm.worldTurn') },
                  ]
                : kind === 'roll'
                  ? [
                      ...ctx.checks.map((c) => ({ id: `checks.${c.event}`, name: c.name })),
                      ...ctx.rollables.map((r) => ({ id: r.ref, name: `${r.name} (${r.ref})` })),
                    ]
                  : ctx.params.map((p) => ({ id: `params.${p.id}`, name: p.name }))}
            <label class="grow">
              <span
                >{t(`steps.fields.${key(kind)}`)}<InfoTip
                  text={t(`steps.help.${key(kind)}`)}
                /></span
              >
              <select
                value={String(value ?? '')}
                {disabled}
                onchange={(e) => put(kind, e.currentTarget.value)}
              >
                {#if !options.some((o) => o.id === value)}<option value={String(value ?? '')}
                    >{value || t('steps.noChoice')}</option
                  >{/if}
                {#each options as o (o.id)}<option value={o.id}>{o.name}</option>{/each}
              </select>
            </label>
          {:else if kind === 'say' || kind === 'pause'}
            <label class="grow">
              <span
                >{t(`steps.fields.${key(kind)}`)}<InfoTip
                  text={t(`steps.help.${key(kind)}`)}
                /></span
              >
              <input
                type="text"
                value={value === true ? '' : valueText(value)}
                {disabled}
                onchange={(e) =>
                  put(kind, e.currentTarget.value.trim() || (kind === 'pause' ? true : '…'))}
              />
            </label>
          {/if}
        </div>

        {#if kind === 'ask' && !ctx.params.length}
          <small class="muted">{t('steps.noParams')}</small>
        {/if}

        {#if kind === 'do' && doTarget}
          {#if doTarget.params.length}
            <div class="sub">
              <span class="label">{t('steps.fields.with')}</span>
              {#each doTarget.params as p (p.id)}
                {@const given = (s.with as Raw | undefined)?.[p.id]}
                <label class="inline">
                  <span>{p.name}</span>
                  <select
                    value={given === undefined ? '' : String(given)}
                    {disabled}
                    onchange={(e) => setWith(p.id, e.currentTarget.value)}
                  >
                    <option value="">{t('steps.with.default')}</option>
                    {#if given !== undefined && !p.choices.includes(String(given))}<option
                        value={String(given)}>{String(given)}</option
                      >{/if}
                    {#each p.choices as c (c)}<option value={c}>{c}</option>{/each}
                  </select>
                </label>
              {/each}
            </div>
          {/if}
        {/if}

        {#if kind === 'effects' || kind === 'set'}
          {@const keys = kind === 'effects' ? ctx.effectKeys : ctx.values}
          <div class="sub">
            <span class="label"
              >{t(`steps.fields.${key(kind)}`)}<InfoTip text={t(`steps.help.${key(kind)}`)} /></span
            >
            <PairEditor
              {value}
              {keys}
              fresh={kind === 'set' ? true : 1}
              keyLabel={t('steps.pairs.key')}
              {locale}
              {disabled}
              label={t(`steps.fields.${key(kind)}`)}
              onchange={(map) => put(kind, map ?? {})}
            />
          </div>
        {/if}

        {#if kind === 'wait'}
          <div class="sub">
            <span class="label"
              >{t('steps.fields.wait')}<InfoTip text={t('steps.help.wait')} /></span
            >
            <ConditionEditor
              value={step.wait}
              suggestions={ctx.conditions}
              {locale}
              {disabled}
              label={t('steps.fields.wait')}
              onchange={(c) => put('wait', c ?? {})}
            />
            <label class="limit">
              <span>{t('steps.fields.limit')}<InfoTip text={t('steps.help.limit')} /></span>
              <SuggestInput
                label={t('steps.fields.limit')}
                value={valueText(s.limit)}
                list={ctx.times}
                {disabled}
                onchange={(v) => put('limit', typed(v))}
              />
            </label>
          </div>
        {/if}

        <div class="conditions">
          <div class="sub">
            <span class="label">{t('actions.when')}<InfoTip text={t('actions.stepsHelp')} /></span>
            <ConditionEditor
              value={step.when}
              suggestions={ctx.conditions}
              {locale}
              {disabled}
              label={t('actions.when')}
              onchange={(c) => put('when', c)}
            />
          </div>
          <div class="sub">
            <span class="label">{t('actions.unless')}<InfoTip text={t('actions.stepsHelp')} /></span
            >
            <ConditionEditor
              value={step.unless}
              suggestions={ctx.conditions}
              {locale}
              {disabled}
              label={t('actions.unless')}
              onchange={(c) => put('unless', c)}
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</li>

<style>
  .card {
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    background: var(--bg, transparent);
  }

  .card.over {
    border-color: var(--accent);
    box-shadow: 0 -2px 0 var(--accent);
  }

  .grip {
    padding: 0 2px;
    color: var(--text-muted);
    cursor: grab;
    user-select: none;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
  }

  .title {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 2px 8px;
    align-items: baseline;
    min-width: 0;
    padding: 4px;
    font: inherit;
    font-size: 13px;
    color: var(--text);
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }

  .arrow {
    color: var(--text-muted);
  }

  .said {
    overflow-wrap: anywhere;
  }

  .cond {
    font-size: 11px;
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }

  .buttons {
    display: flex;
    gap: 2px;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 10px 10px 26px;
  }

  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: end;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .kind {
    flex: 0 0 auto;
  }

  .grow {
    flex: 1 1 12em;
    min-width: 0;
  }

  label input {
    width: 100%;
  }

  .sub {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 12px;
    color: var(--text-muted);
  }

  .inline {
    flex-direction: row;
    gap: 8px;
    align-items: center;
  }

  .limit {
    max-width: 16em;
  }

  .conditions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18em, 1fr));
    gap: 8px 16px;
  }

  button.yaml {
    width: auto;
    padding: 0 6px;
    font-size: 10px;
    letter-spacing: 0.05em;
  }

  button.yaml.on {
    color: var(--accent);
    border-color: var(--accent);
  }

  .muted {
    font-size: 11px;
    color: var(--text-muted);
  }
</style>
