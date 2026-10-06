<script lang="ts">
  import { getAt, type DefinitionDoc } from '../../lib/packs/doc.svelte'

  /**
   * A text of the definition (name, description, template, input labels…) at `path`: edits
   * the base file, or the translation overlay (same path) when translating; the base text
   * then shows as a placeholder.
   */
  let {
    doc,
    path,
    multiline = false,
    placeholder: hint = '',
  }: { doc: DefinitionDoc; path: string[]; multiline?: boolean; placeholder?: string } = $props()

  const base = $derived(String(getAt(doc.raw, path) ?? ''))
  const value = $derived(doc.translating ? doc.overlayText(path) : base)
  const placeholder = $derived(doc.translating ? base || hint : hint)

  function change(text: string) {
    if (doc.translating) doc.translate(path, text)
    else doc.edit(path, text)
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
