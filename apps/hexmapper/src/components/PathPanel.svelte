<script lang="ts">
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { PATH_KINDS } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import { cancelPath, finishPath, popPathPoint } from '../lib/tools/tools'

  const swatches = {
    road: '#6e4f2c',
    trail: '#6e4f2c',
    river: '#3f78a8',
    wall: '#3a3631',
    border: '#8b1e1e',
  } as const

  const pathCount = $derived.by(() => {
    void editor.revision
    return editor.map.paths.length
  })
</script>

<div class="kinds" role="radiogroup">
  {#each PATH_KINDS as kind (kind)}
    <button
      role="radio"
      aria-checked={editor.pathKind === kind}
      class:active={editor.pathKind === kind}
      onclick={() => (editor.pathKind = kind)}
    >
      <span class="swatch {kind}" style:--color={swatches[kind]}></span>
      {t(`pathKinds.${kind}` as MessageKey)}
    </button>
  {/each}
</div>

<label class="check">
  <input type="checkbox" bind:checked={editor.pathStraight} />
  {t('path.straight')}
</label>
<label class="check">
  <input type="checkbox" bind:checked={editor.pathClosed} />
  {t('path.closed')}
</label>

{#if editor.pathDraft}
  <p class="status">{t('path.drawing', { count: editor.pathDraft.hexes.length })}</p>
  <div class="actions">
    <button class="primary" disabled={editor.pathDraft.hexes.length < 2} onclick={finishPath}
      >{t('path.finish')}</button
    >
    <button onclick={popPathPoint}>{t('path.undoPoint')}</button>
    <button onclick={cancelPath}>{t('path.cancel')}</button>
  </div>
{:else}
  <p class="help">{t('path.help')}</p>
{/if}

<p class="help">{t('path.editHelp')}</p>
<p class="help">{t('path.count', { count: pathCount })}</p>

<style>
  .kinds {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .kinds button,
  .actions button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .kinds button.active,
  .actions .primary:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .actions button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .swatch {
    width: 18px;
    height: 4px;
    background: var(--color);
    border-radius: 2px;
  }

  .swatch.river {
    height: 6px;
  }

  .swatch.trail {
    background: repeating-linear-gradient(90deg, var(--color) 0 5px, transparent 5px 8px);
  }

  .swatch.border {
    height: 3px;
    background: repeating-linear-gradient(90deg, var(--color) 0 7px, transparent 7px 9px);
  }

  .swatch.wall {
    height: 6px;
    border: 2px solid var(--color);
    background: repeating-linear-gradient(90deg, #9c9480 0 3px, var(--color) 3px 6px);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status {
    margin: 0;
    color: var(--accent);
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
