<script lang="ts">
  import type { Resolution } from '@open-tabletop/oracle-engine'
  import type { DiceResult } from '@open-tabletop/dice'
  import { t } from '../lib/i18n'
  import { displayName } from '../lib/names'
  import { workspace } from '../lib/packs/workspace.svelte'
  import Self from './ResultCard.svelte'

  let { resolution, top = true }: { resolution: Resolution; top?: boolean } = $props()

  const scalars = $derived(
    Object.entries(resolution.value).filter(
      ([key, v]) => key !== 'text' && (typeof v !== 'object' || v === null),
    ),
  )
  const empty = $derived(!resolution.text && !resolution.entry && !resolution.children.length)

  function dice(r: DiceResult): string {
    const parts = r.terms.map((term) =>
      term.kind === 'dice'
        ? `[${term.rolls.map((v, i) => (term.kept.includes(i) ? v : `~${v}~`)).join(', ')}]`
        : `${term.sign < 0 ? '−' : '+'}${term.value}`,
    )
    return `${r.expression} → ${r.total}  ${parts.join(' ')}${r.discarded ? `  (${r.discarded.total})` : ''}`
  }
</script>

<div class="result" class:top>
  {#if resolution.text}
    <p class="text">{resolution.text}</p>
  {:else if empty && top}
    <p class="text muted">{t('roll.nothing')}</p>
  {/if}
  {#if scalars.length}
    <dl>
      {#each scalars as [key, value] (key)}
        <div>
          <dt>{key}</dt>
          <dd>{String(value)}</dd>
        </div>
      {/each}
    </dl>
  {/if}
  {#if resolution.rolls.length}
    <ul class="dice">
      {#each resolution.rolls as r, i (i)}
        <li>{dice(r)}</li>
      {/each}
    </ul>
  {/if}
  {#if resolution.children.length}
    <details open={!top}>
      <summary>{t('roll.details')}</summary>
      {#each resolution.children as child, i (i)}
        <div class="child">
          <span class="source"
            >{displayName(workspace.registry.definitions.get(child.source), child.source)}</span
          >
          <Self resolution={child} top={false} />
        </div>
      {/each}
    </details>
  {/if}
</div>

<style>
  .result {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .text {
    margin: 0;
    white-space: pre-wrap;
  }

  .top > .text {
    font-family: 'Georgia', serif;
    font-size: 20px;
    line-height: 1.35;
  }

  .muted {
    color: var(--text-muted);
  }

  dl {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin: 0;
    font-size: 12px;
  }

  dl div {
    display: flex;
    gap: 4px;
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
  }

  .dice {
    margin: 0;
    padding: 0;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: var(--text-muted);
    list-style: none;
  }

  details summary {
    font-size: 12px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .child {
    margin: 6px 0 0 4px;
    padding-left: 10px;
    border-left: 2px solid var(--panel-border);
  }

  .source {
    font-size: 12px;
    color: var(--accent);
  }
</style>
