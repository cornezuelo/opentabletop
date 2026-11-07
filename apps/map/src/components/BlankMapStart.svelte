<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'
  import { blankMap, startOnBlankMap } from '../lib/play/play'
  import { editor } from '../lib/store/editor.svelte'

  /** Over a map that's discovered by playing and has nothing yet: what it is, and how to start. */
  const shown = $derived.by(() => {
    void editor.revision
    return editor.mode === 'play' && !!editor.map.play?.discover?.on && blankMap()
  })
</script>

{#if shown}
  <div class="start">
    <h3>{t('play.blankTitle')}</h3>
    <p class="hint">{t('play.blankHelp')}</p>
    <button class="button primary" onclick={startOnBlankMap}>{t('play.blankStart')}</button>
  </div>
{/if}

<style>
  .start {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 360px;
    padding: 20px 24px;
    text-align: center;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }
</style>
