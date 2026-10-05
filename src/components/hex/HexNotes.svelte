<script lang="ts">
  import { t } from '../../lib/i18n/index.svelte'
  import { renderMarkdown } from '../../lib/markdown'
  import type { HexKey } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'

  let { key, notes }: { key: HexKey; notes: string } = $props()

  /** Hex being edited, captured at start so a late save never lands on another hex. */
  let editingKey = $state<HexKey | null>(null)
  let draft = $state('')
  let textarea = $state<HTMLTextAreaElement>()
  const html = $derived(renderMarkdown(notes))

  function start() {
    draft = notes
    editingKey = key
    queueMicrotask(() => textarea?.focus())
  }

  function finish() {
    if (!editingKey) return
    const target = editingKey
    editingKey = null
    editor.editHex(target, (h) => ({ ...h, notes: draft }))
  }

  // Save if the component goes away mid-edit (e.g. the map is replaced).
  $effect(() => () => finish())
</script>

<div class="field">
  <div class="header">
    <span>{t('hex.notes')}</span>
    <!-- preventDefault on mousedown keeps the textarea focused, so blur doesn't race the click. -->
    <button
      class="link"
      onmousedown={(e) => e.preventDefault()}
      onclick={() => (editingKey ? finish() : start())}
    >
      {editingKey ? t('hex.done') : t('hex.edit')}
    </button>
  </div>
  {#if editingKey}
    <textarea
      bind:this={textarea}
      bind:value={draft}
      rows="8"
      placeholder={t('hex.notesPlaceholder')}
      onkeydown={(e) => {
        if (e.key === 'Escape') finish()
      }}
      onblur={finish}></textarea>
  {:else if notes}
    <!-- Sanitized by renderMarkdown. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <div class="markdown" role="button" tabindex="0" ondblclick={start}>{@html html}</div>
  {:else}
    <button class="empty" onclick={start}>{t('hex.noNotes')}</button>
  {/if}
</div>

<style>
  .header {
    display: flex;
    justify-content: space-between;
  }

  textarea {
    width: 100%;
    resize: vertical;
    font-family: ui-monospace, monospace;
    font-size: 13px;
  }

  .markdown {
    padding: 6px 8px;
    color: var(--text);
    background: var(--bg);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .markdown :global(:first-child) {
    margin-top: 0;
  }

  .markdown :global(:last-child) {
    margin-bottom: 0;
  }

  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) {
    margin: 0.6em 0 0.3em;
    font-size: 1.05em;
    color: var(--accent);
  }

  .markdown :global(p),
  .markdown :global(ul),
  .markdown :global(ol) {
    margin: 0.4em 0;
  }

  .markdown :global(ul),
  .markdown :global(ol) {
    padding-left: 1.3em;
  }

  .markdown :global(a) {
    color: var(--accent);
  }

  .empty {
    padding: 6px 8px;
    text-align: left;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px dashed var(--panel-border);
    border-radius: 4px;
    cursor: text;
  }
</style>
