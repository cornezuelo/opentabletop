<script lang="ts">
  import type { Compiled, CompiledEntry, EntryList } from '@open-tabletop/oracle-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n'
  import { displayName, entryText } from '../lib/names'
  import { workspace } from '../lib/packs/workspace.svelte'
  import { roller } from '../lib/roll/roller.svelte'
  import { contextVariables, parseContext } from '../lib/roll/variables'
  import ResultCard from './ResultCard.svelte'

  let { def }: { def: Compiled } = $props()

  const variables = $derived(contextVariables(workspace.registry, def.id))
  const inputs = $derived(def.kind === 'oracle' ? Object.entries(def.inputs) : [])
  $effect.pre(() => {
    if (!roller.contexts[def.id]) roller.contexts[def.id] = {}
  })
  const values = $derived(roller.contexts[def.id] ?? {})
  const shown = $derived(roller.shown[def.id])

  /** Entries to preview: the table's, or the chosen oracle variant's. */
  const list = $derived.by((): EntryList | undefined => {
    if (def.kind === 'table') return def
    if (def.kind === 'oracle') {
      const [input, spec] = inputs[0] ?? []
      const option = (input && values[input]) || spec?.default || spec?.options[0]
      return option ? def.variants[option] : undefined
    }
    return undefined
  })

  const deck = $derived.by(() => {
    if (def.kind !== 'deck') return undefined
    const total = def.cards.reduce((n, c) => n + c.count, 0)
    return { total, left: roller.state.decks[def.id]?.draw.length ?? total }
  })

  function roll() {
    roller.run(def.id, parseContext(values), def.kind === 'deck' ? 'draw' : 'resolve')
  }

  function onkeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, button, [contenteditable], .cm-editor')) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      roll()
    }
  }

  const range = (e: CompiledEntry, l: EntryList) =>
    !l.roll
      ? t('roll.weight', { weight: e.weight })
      : e.min === e.max
        ? String(e.min)
        : `${e.min}–${e.max}`

  const condition = (when: unknown) =>
    Object.entries(when as Record<string, unknown>)
      .map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v) : `= ${String(v)}`}`)
      .join(', ')

  const chosen = $derived(shown?.resolution.entry)
</script>

<svelte:window {onkeydown} />

<div class="roll">
  {#if inputs.length || variables.length}
    <fieldset>
      <legend>{t('roll.context')}<InfoTip text={t('roll.contextHelp')} /></legend>
      {#each inputs as [input, spec] (input)}
        <label class="field">
          <span>{input}</span>
          <select bind:value={values[input]}>
            {#each spec.options as option (option)}
              <option value={option} selected={!values[input] && option === spec.default}
                >{option}</option
              >
            {/each}
          </select>
        </label>
      {/each}
      {#each variables as variable (variable.name)}
        <label class="field">
          <span>{variable.name}</span>
          <input
            type="text"
            list={variable.suggestions.length ? `vars-${variable.name}` : undefined}
            bind:value={values[variable.name]}
          />
          {#if variable.suggestions.length}
            <datalist id="vars-{variable.name}">
              {#each variable.suggestions as s (s)}<option value={s}></option>{/each}
            </datalist>
          {/if}
        </label>
      {/each}
    </fieldset>
  {/if}

  <div class="actions">
    <button class="primary" onclick={roll}>{deck ? t('roll.draw') : t('roll.roll')}</button>
    {#if deck}
      <span class="muted">{t('roll.remaining', deck)}</span>
      <button onclick={() => roller.shuffle(def.id)}>{t('roll.shuffle')}</button>
    {:else}
      <label class="inline">
        <select bind:value={roller.advantage}>
          <option value={0}>{t('roll.advantages.normal')}</option>
          <option value={1}>{t('roll.advantages.advantage')}</option>
          <option value={-1}>{t('roll.advantages.disadvantage')}</option>
        </select>
        <InfoTip text={t('roll.advantageHelp')} />
      </label>
    {/if}
    <span class="hint">{t('roll.keyHint')}</span>
  </div>

  {#if shown}
    {#key shown.id}
      <div class="card"><ResultCard resolution={shown.resolution} /></div>
    {/key}
  {/if}

  {#if list}
    <h3>
      {t('roll.entries')}{#if list.roll}<span class="muted"> · {list.roll}</span>{/if}
    </h3>
    <table>
      <tbody>
        {#each list.entries as entry (entry.key)}
          <tr class:chosen={chosen === entry.key}>
            <td class="range">{range(entry, list)}</td>
            <td>
              {entryText(def, entry) ?? ''}
              {#if entry.ref}
                <span class="muted">
                  {t('roll.then', {
                    target: entry.ref.dynamic
                      ? entry.ref.target
                      : displayName(
                          workspace.registry.definitions.get(entry.ref.target),
                          entry.ref.target,
                        ),
                  })}</span
                >
              {/if}
              {#if entry.when}
                <span class="cond"
                  >{t('roll.conditional', { condition: condition(entry.when) })}</span
                >
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .roll {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  fieldset {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0;
    padding: 8px 10px 10px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  legend {
    padding: 0 4px;
    color: var(--text-muted);
  }

  fieldset .field {
    width: 150px;
  }

  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .actions button {
    padding: 7px 14px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .actions button.primary {
    min-width: 110px;
    font-weight: 600;
    color: var(--bg);
    background: var(--accent);
    border-color: var(--accent);
  }

  .inline {
    display: flex;
    align-items: center;
  }

  .hint {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
  }

  .card {
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-left: 3px solid var(--accent);
    border-radius: 6px;
    animation: appear 0.18s ease-out;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
  }

  h3 {
    margin: 4px 0 0;
    font-size: 13px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  td {
    padding: 4px 6px;
    vertical-align: top;
    border-bottom: 1px solid var(--panel-border);
  }

  td.range {
    width: 1%;
    color: var(--text-muted);
    white-space: nowrap;
  }

  tr.chosen td {
    background: rgb(200 162 74 / 0.16);
  }

  .muted,
  .cond {
    color: var(--text-muted);
  }

  .cond {
    display: block;
    font-size: 11px;
  }
</style>
