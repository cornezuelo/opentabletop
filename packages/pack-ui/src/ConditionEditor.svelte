<script lang="ts">
  import { untrack } from 'svelte'
  import { showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { flowText, parseFlow } from './flow'
  import {
    BARE_OPS,
    CONDITION_OPS,
    conditionFacts,
    conditionRows,
    LIST_OPS,
    rowsCondition,
    type ConditionOp,
    type ConditionRows,
  } from './conditionRows'
  import { translator } from './i18n'

  /**
   * A condition (`when`, `unless`, a step's `wait`…) built as rows of _what it reads ·
   * comparison · value_, each fact and value suggested from what the system declares, joined
   * by **All of these** or **Any of these**; one click shows it as YAML instead. A condition
   * rows can't show (nested groups) is shown as YAML only, never lost.
   */
  let {
    value,
    suggestions = {},
    locale,
    disabled = false,
    label,
    onchange,
  }: {
    value: unknown
    /** What conditions can read, each with the values it takes (`contextSuggestions`). */
    suggestions?: Record<string, readonly string[]>
    locale: string
    disabled?: boolean
    /** The condition's name, for screen readers ("Only if"). */
    label: string
    onchange: (condition: Record<string, unknown> | undefined) => void
  } = $props()

  const t = translator(() => locale)
  const facts = $derived(conditionFacts(suggestions))
  /** Shown as YAML by choice. */
  let yaml = $state(false)
  /**
   * The rows being edited: the value's, plus rows not written yet (no fact), kept while
   * they say the same as the value.
   */
  let local = $state<ConditionRows | null>(null)
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  $effect(() => {
    const next = conditionRows(value)
    untrack(() => {
      if (!local || !next || !same(rowsCondition(local), value)) local = next
    })
  })
  const intricate = $derived(local === null)
  const asYaml = $derived(yaml || intricate)

  function write(next: ConditionRows) {
    local = next
    const condition = rowsCondition(next)
    if (!same(condition, value)) onchange(condition)
  }
  const edit = (i: number, change: Partial<ConditionRows['rows'][number]>) =>
    local &&
    write({ ...local, rows: local.rows.map((r, j) => (j === i ? { ...r, ...change } : r)) })
  const add = () =>
    local && write({ ...local, rows: [...local.rows, { fact: '', op: 'is', value: '' }] })
  const remove = (i: number) =>
    local && write({ ...local, rows: local.rows.filter((_, j) => j !== i) })

  function setYaml(text: string) {
    const parsed = parseFlow(text)
    if (parsed === null) return showToast(t('condition.badYaml'), 'error')
    onchange(parsed && Object.keys(parsed).length ? parsed : undefined)
  }
</script>

<div class="condition" role="group" aria-label={label}>
  {#if asYaml}
    <SuggestInput
      {label}
      value={flowText(value).replace(/^\{\s*|\s*\}$/g, '')}
      {suggestions}
      {disabled}
      onchange={setYaml}
    />
    {#if intricate}<small class="muted">{t('condition.intricate')}</small>{/if}
  {:else if local}
    {#if local.rows.length > 1}
      <select
        class="join"
        aria-label={label}
        value={local.join}
        {disabled}
        onchange={(e) => local && write({ ...local, join: e.currentTarget.value as 'all' | 'any' })}
      >
        <option value="all">{t('condition.all')}</option>
        <option value="any">{t('condition.any')}</option>
      </select>
    {/if}
    {#each local.rows as row, i (i)}
      <div class="row">
        <div class="fact">
          <SuggestInput
            label={t('condition.fact')}
            placeholder={t('condition.fact')}
            value={row.fact}
            list={facts}
            {disabled}
            onchange={(fact) => edit(i, { fact: fact.trim() })}
          />
        </div>
        <select
          aria-label={t('condition.op')}
          value={row.op}
          {disabled}
          onchange={(e) => edit(i, { op: e.currentTarget.value as ConditionOp })}
        >
          {#each CONDITION_OPS as op (op)}<option value={op}>{t(`condition.ops.${op}`)}</option
            >{/each}
        </select>
        {#if !BARE_OPS.includes(row.op)}
          <div class="value">
            <SuggestInput
              label={LIST_OPS.includes(row.op) ? t('condition.values') : t('condition.value')}
              placeholder={LIST_OPS.includes(row.op) ? t('condition.values') : t('condition.value')}
              value={row.value}
              list={suggestions[row.fact] ?? []}
              {disabled}
              onchange={(v) => edit(i, { value: v })}
            />
          </div>
        {/if}
        {#if !disabled}
          <button
            class="icon"
            aria-label={t('condition.remove')}
            use:tooltip={t('condition.remove')}
            onclick={() => remove(i)}>×</button
          >
        {/if}
      </div>
    {/each}
  {/if}
  {#if disabled && !asYaml && !local?.rows.length}
    <span class="muted">{t('condition.none')}</span>
  {:else}
    <div class="tools">
      {#if !asYaml && !disabled}
        <button class="link" onclick={add}
          >{local?.rows.length ? t('condition.add') : t('condition.addFirst')}</button
        >
      {/if}
      {#if !intricate}
        <button
          class="link toggle"
          aria-pressed={yaml}
          use:tooltip={yaml ? t('editAs.rows') : t('editAs.yaml')}
          onclick={() => (yaml = !yaml)}>{yaml ? t('editAs.rowsShort') : 'YAML'}</button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .condition {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    font-size: 12px;
  }

  .row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .fact {
    flex: 1 1 12em;
    min-width: 0;
  }

  .value {
    flex: 1 1 8em;
    min-width: 0;
  }

  .row select {
    flex: none;
    max-width: 10em;
  }

  .join {
    align-self: flex-start;
  }

  .tools {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }

  .toggle {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
  }

  .toggle:hover {
    color: var(--accent);
  }

  .muted {
    font-size: 11px;
    color: var(--text-muted);
  }

  span.muted {
    font-size: 12px;
  }
</style>
