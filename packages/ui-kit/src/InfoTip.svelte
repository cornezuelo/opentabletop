<script lang="ts">
  import { attachHelp } from './contextHelp.svelte'

  /**
   * The explanation of the control it sits in (a label's text, a column header, a title).
   * It draws nothing: its parent gets a dotted underline, and clicking it shows the text in
   * the app's help column (see contextHelp). `markdown`: a pack's text, with its formatting.
   */
  let { text = '', markdown = '' }: { text?: string; markdown?: string } = $props()
  let anchor: HTMLSpanElement

  $effect(() => {
    if (!text && !markdown) return
    return attachHelp(anchor, markdown ? { markdown } : { text })
  })
</script>

<span bind:this={anchor} hidden></span>

<style>
  /* Labels with help: a dotted underline says there is help; the help column shows it. */
  :global(.has-help) {
    text-decoration: underline dotted color-mix(in srgb, var(--text-muted) 70%, transparent);
    text-underline-offset: 3px;
    cursor: help;
  }

  :global(.has-help:hover),
  :global(.has-help:focus-visible) {
    text-decoration-color: var(--accent);
    outline: none;
  }
</style>
