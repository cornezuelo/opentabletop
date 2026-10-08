<script lang="ts">
  import { getAt, type DefinitionDoc } from '../../lib/packs/doc.svelte'

  /**
   * A text of the definition (name, description, template, input labels…) at `path`: edits
   * the base file, or the translation overlay (same path) when translating; the base text
   * then shows as a placeholder. `overlay` is the translation's path when it differs (a
   * generator field's `value` is translated at `fields.<name>`).
   */
  let {
    doc,
    path,
    overlay = path,
    multiline = false,
    placeholder: hint = '',
  }: {
    doc: DefinitionDoc
    path: string[]
    overlay?: string[]
    multiline?: boolean
    placeholder?: string
  } = $props()

  const base = $derived(String(getAt(doc.raw, path) ?? ''))
  const value = $derived(doc.translating ? doc.overlayText(overlay) : base)
  const placeholder = $derived(doc.translating ? base || hint : hint)

  function change(text: string) {
    if (doc.translating) doc.translate(overlay, text)
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
