<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
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

  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest('.cm-editor') !== null ||
      (target instanceof HTMLInputElement &&
        !['checkbox', 'radio', 'range', 'color', 'button'].includes(target.type)) ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)

  function onkeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || typing(e.target)) return
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
  use:tooltip={undoLabel}
  disabled={!library.canUndo}
  onclick={() => library.undo()}>↶</button
>
<button
  class="undo"
  aria-label={redoLabel}
  use:tooltip={redoLabel}
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
