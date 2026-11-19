<script lang="ts">
  import { isTyping, tooltip, UNDO_KEYS } from '@open-tabletop/ui-kit'
  import type { PackLibrary } from './library.svelte'

  /**
   * Undo / redo of the user packs' edits, with Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y. Inside
   * text fields and the YAML editor those keys keep undoing the text itself.
   */
  let {
    library,
    undoLabel,
    redoLabel,
  }: { library: PackLibrary; undoLabel: string; redoLabel: string } = $props()

  function onkeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || isTyping(e)) return
    const key = e.key.toLowerCase()
    if (key === 'z' && !e.shiftKey) library.undo()
    else if ((key === 'z' && e.shiftKey) || key === 'y') library.redo()
    else return
    e.preventDefault()
  }
</script>

<svelte:window {onkeydown} />

<button
  class="undo"
  aria-label={undoLabel}
  use:tooltip={{ text: undoLabel, keys: UNDO_KEYS.undo }}
  disabled={!library.canUndo}
  onclick={() => library.undo()}>↶</button
>
<button
  class="undo"
  aria-label={redoLabel}
  use:tooltip={{ text: redoLabel, keys: UNDO_KEYS.redo }}
  disabled={!library.canRedo}
  onclick={() => library.redo()}>↷</button
>

<style>
  .undo {
    width: 30px;
    padding: 4px 0;
    font-size: 16px;
  }

  .undo:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
