<script lang="ts">
  import type { DefinitionDoc } from '../../lib/packs/doc.svelte'

  /**
   * A text of the definition (name, description, template…): edits the base file, or the
   * translation overlay when translating (the base text shows as a placeholder).
   */
  let {
    doc,
    key,
    multiline = false,
  }: { doc: DefinitionDoc; key: string; multiline?: boolean } = $props()

  const base = $derived(String(doc.raw[key] ?? ''))
  const value = $derived(doc.translating ? doc.overlayText([key]) : base)
  const placeholder = $derived(doc.translating ? base : '')

  function change(text: string) {
    if (doc.translating) doc.translate([key], text)
    else doc.edit([key], text)
  }
</script>

{#if multiline}
  <textarea rows="3" {value} {placeholder} onchange={(e) => change(e.currentTarget.value)}
  ></textarea>
{:else}
  <input type="text" {value} {placeholder} onchange={(e) => change(e.currentTarget.value)} />
{/if}

<style>
  textarea {
    width: 100%;
    resize: vertical;
  }
</style>
