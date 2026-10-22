<script lang="ts">
  import { showToast, SuggestInput, tooltip } from '@open-tabletop/ui-kit'
  import { flowText, parseFlow } from './flow'
  import { readValue, valueText } from './conditionRows'
  import { addPair, pairRows, rowsPairs, setPair, type PairValue, type Pairs } from './pairRows'
  import { translator } from './i18n'

  /**
   * A map of `key: value` pairs (effects, a check's context, values of the day…) as rows of
   * _key · value_, the key suggested from what the system declares; one click shows it as
   * YAML instead. A map rows can't show (a value that is a list or a map) is YAML only.
   */
  let {
    value,
    keys = [],
    values = {},
    fresh = 1,
    keyLabel,
    locale,
    disabled = false,
    label,
    onchange,
  }: {
    value: unknown
    /** The keys to suggest, in order: a new row takes the first one not used yet. */
    keys?: readonly string[]
    /** The values each key may take, to suggest. */
    values?: Record<string, readonly string[]>
    /** A new row's value. */
    fresh?: PairValue
    /** What the key column holds ("What changes"); "Name" if not given. */
    keyLabel?: string
    locale: string
    disabled?: boolean
    /** The map's name, for screen readers ("Changes"). */
    label: string
    onchange: (map: Record<string, PairValue> | undefined) => void
  } = $props()

  const t = translator(() => locale)
  /** Shown as YAML by choice. */
  let yaml = $state(false)
  const rows = $derived(pairRows(value))
  const asYaml = $derived(yaml || rows === null)
  const keyName = $derived(keyLabel ?? t('pairs.key'))

  function write(next: Pairs | null, key?: string) {
    if (next === null) return showToast(t('pairs.taken', { key: key ?? '' }), 'error')
    onchange(rowsPairs(next))
  }

  function setYaml(text: string) {
    const parsed = parseFlow(text)
    if (parsed === null) return showToast(t('pairs.badYaml'), 'error')
    onchange(
      parsed && Object.keys(parsed).length ? (parsed as Record<string, PairValue>) : undefined,
    )
  }
</script>

<div class="pairs" role="group" aria-label={label}>
  {#if asYaml}
    <SuggestInput
      {label}
      value={flowText(value).replace(/^\{\s*|\s*\}$/g, '')}
      suggestions={values}
      {disabled}
      onchange={setYaml}
    />
    {#if rows === null}<small class="muted">{t('pairs.intricate')}</small>{/if}
  {:else if rows}
    {#each rows as [k, v], i (k)}
      <div class="row">
        <div class="key">
          <SuggestInput
            label={keyName}
            placeholder={keyName}
            value={k}
            list={keys}
            {disabled}
            onchange={(name) => write(setPair(rows, i, name.trim(), v), name.trim())}
          />
        </div>
        <div class="value">
          <SuggestInput
            label={t('pairs.value')}
            placeholder={t('pairs.value')}
            value={valueText(v)}
            list={values[k] ?? []}
            {disabled}
            onchange={(text) => write(setPair(rows, i, k, readValue(text)))}
          />
        </div>
        {#if !disabled}
          <button
            class="icon"
            aria-label={t('pairs.remove')}
            use:tooltip={t('pairs.remove')}
            onclick={() => write(setPair(rows, i, '', v))}>×</button
          >
        {/if}
      </div>
    {/each}
  {/if}
  {#if disabled && !asYaml && !rows?.length}
    <span class="muted">{t('pairs.none')}</span>
  {:else}
    <div class="tools">
      {#if !asYaml && !disabled}
        <button class="link" onclick={() => rows && write(addPair(rows, keys, fresh))}
          >{rows?.length ? t('pairs.add') : t('pairs.addFirst')}</button
        >
      {/if}
      {#if rows !== null}
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
  .pairs {
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

  .key {
    flex: 1 1 12em;
    min-width: 0;
  }

  .value {
    flex: 0 1 9em;
    min-width: 0;
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
