<script lang="ts">
  import { WORLD_STEP_KINDS, type WorldStep, type WorldStepKind } from '@open-tabletop/world-engine'
  import { ConditionEditor, PairEditor } from '@open-tabletop/pack-ui'
  import { InfoTip, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../../lib/i18n'

  /**
   * The steps of one of the world's reactions, in order: each does one thing (says a line,
   * rolls a table, changes the world, or brings another reaction or a world turn), with its
   * own **Only when** as rows. Changes write the whole list.
   */
  let {
    value,
    disabled = false,
    rollable,
    brings,
    effects,
    hints,
    onchange,
  }: {
    value: unknown
    disabled?: boolean
    /** What a step may roll (`table.rumours`, `core/table.twists`). */
    rollable: string[]
    /** What a `do:` may name: `world.turn` and the other reactions. */
    brings: { id: string; name: string }[]
    /** What effects may change, with their values. */
    effects: Record<string, readonly string[]>
    /** What conditions read. */
    hints: Record<string, readonly string[]>
    onchange: (steps: WorldStep[] | undefined) => void
  } = $props()

  const steps = $derived((Array.isArray(value) ? value : []) as WorldStep[])
  const locale = $derived(getLocale())
  const kindOf = (step: WorldStep): WorldStepKind =>
    WORLD_STEP_KINDS.find((k) => step[k] !== undefined) ?? 'say'
  /** A new kind's value that works. */
  const fresh = (kind: WorldStepKind): unknown =>
    kind === 'say'
      ? '…'
      : kind === 'roll'
        ? (rollable[0] ?? 'table.x')
        : kind === 'effects'
          ? {}
          : (brings[0]?.id ?? 'world.turn')

  const write = (next: WorldStep[]) => onchange(next.length ? next : undefined)
  function put(index: number, step: WorldStep) {
    write(steps.map((s, i) => (i === index ? step : s)))
  }
  /** The same step doing something else: its id and conditions kept. */
  function setKind(index: number, kind: WorldStepKind) {
    const { id, when, unless } = steps[index]
    put(index, {
      ...(id && { id }),
      ...(when && { when }),
      ...(unless && { unless }),
      [kind]: fresh(kind),
    } as WorldStep)
  }
  function set(index: number, key: string, v: unknown) {
    const next: Record<string, unknown> = { ...steps[index] }
    if (v === undefined) delete next[key]
    else next[key] = v
    put(index, next as WorldStep)
  }
  function move(index: number, by: number) {
    const to = index + by
    if (to < 0 || to >= steps.length) return
    const next = [...steps]
    next.splice(to, 0, ...next.splice(index, 1))
    write(next)
  }
</script>

<ol class="steps">
  {#each steps as step, i (i)}
    {@const kind = kindOf(step)}
    <li>
      <div class="row">
        <select
          aria-label={t('worldForm.stepKind')}
          value={kind}
          {disabled}
          onchange={(e) => setKind(i, e.currentTarget.value as WorldStepKind)}
        >
          {#each WORLD_STEP_KINDS as k (k)}<option value={k}>{t(`worldForm.kinds.${k}`)}</option
            >{/each}
        </select>
        {#if kind === 'say'}
          <input
            type="text"
            class="grow"
            aria-label={t('worldForm.kinds.say')}
            value={typeof step.say === 'string' ? step.say : ''}
            {disabled}
            onchange={(e) => set(i, 'say', e.currentTarget.value.trim() || '…')}
          />
        {:else if kind === 'roll'}
          <span class="grow">
            <SuggestInput
              label={t('worldForm.kinds.roll')}
              value={step.roll ?? ''}
              list={rollable}
              {disabled}
              onchange={(v) => set(i, 'roll', v.trim() || fresh('roll'))}
            />
          </span>
        {:else if kind === 'do'}
          <select
            class="grow"
            aria-label={t('worldForm.kinds.do')}
            value={step.do}
            {disabled}
            onchange={(e) => set(i, 'do', e.currentTarget.value)}
          >
            {#if !brings.some((b) => b.id === step.do)}<option value={step.do}>{step.do}</option
              >{/if}
            {#each brings as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
          </select>
        {:else}
          <span class="grow">
            <PairEditor
              value={step.effects}
              keys={Object.keys(effects)}
              values={effects}
              fresh={1}
              {locale}
              {disabled}
              label={t('worldForm.kinds.effects')}
              onchange={(v) => set(i, 'effects', v ?? {})}
            />
          </span>
        {/if}
        {#if !disabled}
          <span class="tools">
            <button
              class="icon"
              aria-label={t('worldForm.up')}
              use:tooltip={t('worldForm.up')}
              disabled={i === 0}
              onclick={() => move(i, -1)}>↑</button
            >
            <button
              class="icon"
              aria-label={t('worldForm.down')}
              use:tooltip={t('worldForm.down')}
              disabled={i === steps.length - 1}
              onclick={() => move(i, 1)}>↓</button
            >
            <button
              class="icon"
              aria-label={t('forms.remove')}
              use:tooltip={t('forms.remove')}
              onclick={() => write(steps.filter((_, j) => j !== i))}>×</button
            >
          </span>
        {/if}
      </div>
      <div class="when">
        <span>{t('worldForm.stepWhen')}<InfoTip text={t('worldForm.stepWhenHelp')} /></span>
        <ConditionEditor
          value={step.when}
          suggestions={hints}
          {locale}
          {disabled}
          label={t('worldForm.stepWhen')}
          onchange={(v) => set(i, 'when', v)}
        />
      </div>
    </li>
  {/each}
</ol>
{#if !disabled}
  <button class="add" onclick={() => write([...steps, { say: '…' }])}
    >{t('worldForm.addStep')}</button
  >
{/if}

<style>
  .steps {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding-left: 20px;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: flex-start;
  }

  .grow {
    flex: 1 1 200px;
    min-width: 0;
  }

  .tools {
    display: flex;
    gap: 2px;
  }

  .icon {
    height: 30px;
  }

  .when {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .add {
    align-self: flex-start;
    margin-top: 6px;
    padding: 3px 10px;
    font-size: 12px;
    background: none;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
