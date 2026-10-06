<script lang="ts">
  import { untrack, type Snippet } from 'svelte'
  import type { HistoryItem } from './roller.svelte'
  import DefinitionPicker from './DefinitionPicker.svelte'
  import History from './History.svelte'
  import RollPanel from './RollPanel.svelte'
  import type { OracleUi } from './ui'

  /**
   * Compact Oracle for side panels: pick any definition of the loaded packs, roll it,
   * and browse the history (clicking a past roll opens its definition).
   */
  let {
    ui,
    context = {},
    actions,
    header,
  }: {
    ui: OracleUi
    /** Values the host app already knows (terrain, season…), passed to every roll. */
    context?: Record<string, unknown>
    /** Host buttons under each result. */
    actions?: Snippet<[HistoryItem]>
    /** Host content above the picker (e.g. which hex the rolls read). */
    header?: Snippet
  } = $props()

  // Start on the last rolled definition.
  let selected = $state(untrack(() => ui.roller.history[0]?.source))
  const def = $derived(selected ? ui.library.registry.definitions.get(selected) : undefined)
</script>

<div class="oracle">
  {@render header?.()}
  <DefinitionPicker {ui} {selected} onselect={(id) => (selected = id)} />
  {#if def}
    <h2>{ui.displayName(def)}</h2>
    {#if ui.displayDescription(def)}<p class="muted">{ui.displayDescription(def)}</p>{/if}
    <RollPanel {ui} {def} {context} {actions} hotkeys={false} />
  {:else}
    <p class="muted">{ui.t('picker.choose')}</p>
  {/if}
  <div class="history">
    <History {ui} embedded onopen={(item) => (selected = item.source)} />
  </div>
</div>

<style>
  .oracle {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h2 {
    margin: 4px 0 0;
    font-size: 15px;
    color: var(--accent);
  }

  p {
    margin: 0;
    font-size: 12px;
  }

  .muted {
    color: var(--text-muted);
  }

  .history {
    display: flex;
    flex-direction: column;
    max-height: 320px;
    padding-top: 8px;
    border-top: 1px solid var(--panel-border);
  }
</style>
