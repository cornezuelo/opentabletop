<script lang="ts">
  import type { Compiled, CompiledEntry, EntryList } from '@open-tabletop/oracle-engine'
  import type { Snippet } from 'svelte'
  import type { HistoryItem } from './roller.svelte'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import type { OracleUi } from './ui'
  import { contextVariables, mergeContext, parseContext, valueAt } from './variables'
  import { entryOdds, rollOdds } from './odds'
  import ResultCard from './ResultCard.svelte'

  let {
    ui,
    def,
    context = {},
    hotkeys = true,
    actions,
  }: {
    ui: OracleUi
    def: Compiled
    /** Values the host app already knows (terrain, season…); typed values override them. */
    context?: Record<string, unknown>
    /** Space/Enter rolls again (off when the host uses those keys). */
    hotkeys?: boolean
    /** Host buttons under the result (e.g. the Hexmapper's "Add as a POI"). */
    actions?: Snippet<[HistoryItem]>
  } = $props()
  const { t, roller } = $derived(ui)

  const variables = $derived(contextVariables(ui.library.registry, def.id))
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

  /** The ways of rolling it offers by hand (its system's roll modes), with their names. */
  const modes = $derived(
    def.kind === 'table' || def.kind === 'oracle'
      ? def.modes.flatMap((id) => {
          const mode = ui.library.registry.rollModes.get(id)
          if (!mode) return []
          // The pack's description, or what it does in plain words.
          const rule = t('roll.modeRule', {
            times: mode.repeat,
            keep: t(`roll.keep.${mode.keep}`),
          })
          return [{ id, name: ui.modeName(mode), help: ui.modeDescription(mode) ?? rule }]
        })
      : [],
  )
  const modeHelp = $derived(
    [t('roll.modeHelp'), ...modes.map((m) => `• **${m.name}**: ${m.help}`)].join('\n'),
  )

  function roll() {
    roller.run(
      def.id,
      mergeContext(context, parseContext(values)),
      def.kind === 'deck' ? 'draw' : 'resolve',
      modes.some((m) => m.id === roller.mode) ? roller.mode : undefined,
    )
  }

  /** A host value as a placeholder ("forest", "road, ford"). */
  function known(name: string): string {
    const v = valueAt(context, name)
    if (v === undefined || v === null) return ''
    return Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)
  }

  function onkeydown(e: KeyboardEvent) {
    if (!hotkeys) return
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

  /**
   * The odds of each entry with the context typed and the mode chosen (rolled many times by
   * the engine), and of each total of the dice; only while shown.
   */
  let showOdds = $state(false)
  const usedMode = $derived(modes.some((m) => m.id === roller.mode) ? roller.mode : undefined)
  const odds = $derived.by(() => {
    if (!showOdds || !list) return undefined
    const ctx = mergeContext(context, parseContext(values))
    try {
      return entryOdds(ui.library.registry, def.id, ctx, usedMode)
    } catch {
      return undefined
    }
  })
  const totals = $derived.by(() => {
    if (!showOdds || !list?.roll) return undefined
    const mode = usedMode ? ui.library.registry.rollModes.get(usedMode) : undefined
    const dist = rollOdds(
      list.roll,
      mergeContext(context, parseContext(values)),
      mode && { repeat: mode.repeat, keep: mode.keep },
    )
    if (!dist) return undefined
    const top = Math.max(...dist.values())
    return [...dist].map(([total, p]) => ({ total, p, height: p / top }))
  })
  const percent = (p: number) => (p === 0 ? '0%' : p < 0.005 ? '<1%' : `${Math.round(p * 100)}%`)

  /** A value's tooltip: what it is (if anyone says) and how tables write it. */
  function valueTip(name: string): string {
    const code = '`{{' + name + '}}`'
    const description = ui.valueInfo(name).description
    return description ? `${description}\n\n${code}` : code
  }
</script>

<svelte:window {onkeydown} />

<div class="roll">
  {#if inputs.length || variables.length}
    <fieldset>
      <legend>{t('roll.context')}<InfoTip text={t('roll.contextHelp')} /></legend>
      {#each inputs as [input, spec] (input)}
        <label class="field">
          <span>{ui.inputLabel(def, input)}</span>
          <select bind:value={values[input]}>
            {#each spec.options as option (option)}
              <option value={option} selected={!values[input] && option === spec.default}
                >{ui.optionLabel(def, input, option)}</option
              >
            {/each}
          </select>
        </label>
      {/each}
      {#each variables as variable (variable.name)}
        {@const info = ui.valueInfo(variable.name)}
        <label class="field">
          <span>{info.name ?? variable.name}<InfoTip markdown={valueTip(variable.name)} /></span>
          <input
            type="text"
            list={variable.suggestions.length ? `vars-${variable.name}` : undefined}
            placeholder={known(variable.name)}
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
    {:else if modes.length}
      <label class="inline">
        <span>{t('roll.mode')}<InfoTip text={modeHelp} /></span>
        <select bind:value={roller.mode} aria-label={t('roll.mode')}>
          <option value="">{t('roll.normal')}</option>
          {#each modes as m (m.id)}<option value={m.id}>{m.name}</option>{/each}
        </select>
      </label>
    {/if}
    {#if hotkeys}<span class="hint">{t('roll.keyHint')}</span>{/if}
  </div>

  {#if shown}
    {#key shown.id}
      <div class="card"><ResultCard {ui} resolution={shown.resolution} /></div>
      {#if actions}<div class="actions">{@render actions(shown)}</div>{/if}
    {/key}
  {/if}

  {#if list}
    <div class="entries-head">
      <h3>
        {t('roll.entries')}{#if list.roll}<span class="muted">&nbsp;· {list.roll}</span>{/if}
      </h3>
      <label class="inline odds-toggle">
        <input type="checkbox" bind:checked={showOdds} />
        <span>{t('roll.odds')}<InfoTip text={t('roll.oddsHelp')} /></span>
      </label>
    </div>
    {#if totals}
      <div class="totals" aria-label={t('roll.totals')}>
        {#each totals as bar (bar.total)}
          <div class="bar">
            <span class="fill" style:height="{Math.max(2, bar.height * 40)}px"></span>
            <small>{bar.total}</small>
            <small class="p">{percent(bar.p)}</small>
          </div>
        {/each}
      </div>
    {/if}
    <table>
      <tbody>
        {#each list.entries as entry (entry.key)}
          <tr class:chosen={chosen === entry.key}>
            <td class="range">{range(entry, list)}</td>
            {#if odds}<td class="odds">{percent(odds.entries.get(entry.key) ?? 0)}</td>{/if}
            <td>
              {ui.entryText(def, entry) ?? ''}
              {#if entry.ref}
                <span class="muted">
                  {t('roll.then', {
                    target: entry.ref.dynamic ? entry.ref.target : ui.nameOf(entry.ref.target),
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
        {#if odds && odds.nothing > 0}
          <tr>
            <td class="range">—</td>
            <td class="odds">{percent(odds.nothing)}</td>
            <td class="muted">{t('roll.oddsNothing')}</td>
          </tr>
        {/if}
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
    flex: 1 1 120px;
    max-width: 180px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
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

  td.odds {
    width: 1%;
    color: var(--accent);
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .entries-head {
    display: flex;
    gap: 10px;
    align-items: baseline;
    justify-content: space-between;
  }

  .odds-toggle {
    gap: 4px;
    font-size: 12px;
  }

  .totals {
    display: flex;
    gap: 2px;
    align-items: flex-end;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .bar {
    display: flex;
    flex: 1 0 22px;
    flex-direction: column;
    align-items: center;
    font-size: 10px;
    color: var(--text-muted);
  }

  .bar .fill {
    width: 70%;
    background: var(--accent);
    border-radius: 2px 2px 0 0;
    opacity: 0.7;
  }

  .bar .p {
    font-size: 9px;
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

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>
