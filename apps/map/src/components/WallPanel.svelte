<script lang="ts">
  import { helpMarkdown, Markdown } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { editor } from '../lib/store/editor.svelte'
  import { ReplaceWallsCommand } from '../lib/commands/walls'

  /** The walls tool's panel: how to draw them, how many there are, and taking them all off. */
  const count = $derived((void editor.revision, editor.map.walls.length))

  function clear(): void {
    if (!editor.map.walls.length) return
    editor.execute(new ReplaceWallsCommand(structuredClone(editor.map.walls), []))
  }
</script>

<div class="help"><Markdown text={helpMarkdown(t('walls.help'))} /></div>
<p class="help">{t('walls.count', { count })}</p>
{#if count}
  <button class="clear" onclick={clear}>{t('walls.clear')}</button>
{/if}

<style>
  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .clear {
    align-self: flex-start;
  }
</style>
