<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n/index.svelte'
  import type { HexKey } from '../../lib/model/types'
  import { editor } from '../../lib/store/editor.svelte'

  let { key, tags, suggestions }: { key: HexKey; tags: string[]; suggestions: string[] } = $props()

  let draft = $state('')
  const listId = 'hex-tag-suggestions'

  function add() {
    const tag = draft.trim()
    if (tag) editor.editHex(key, (h) => ({ ...h, tags: [...(h.tags ?? []), tag] }))
    draft = ''
  }

  function remove(tag: string) {
    editor.editHex(key, (h) => ({ ...h, tags: (h.tags ?? []).filter((x) => x !== tag) }))
  }
</script>

<div class="field">
  <span>{t('hex.tags')}</span>
  {#if tags.length > 0}
    <ul class="tags">
      {#each tags as tag (tag)}
        <li>
          {tag}
          <button
            use:tooltip={t('hex.remove')}
            aria-label="{t('hex.remove')}: {tag}"
            onclick={() => remove(tag)}>✕</button
          >
        </li>
      {/each}
    </ul>
  {/if}
  <form
    onsubmit={(e) => {
      e.preventDefault()
      add()
    }}
  >
    <input type="text" bind:value={draft} placeholder={t('hex.addTag')} list={listId} />
    <datalist id={listId}>
      {#each suggestions.filter((s) => !tags.includes(s)) as suggestion (suggestion)}
        <option value={suggestion}></option>
      {/each}
    </datalist>
  </form>
</div>

<style>
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px 2px 8px;
    font-size: 12px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
  }

  li button {
    padding: 0 4px;
    font-size: 10px;
    color: var(--text-muted);
    background: none;
    border: none;
    cursor: pointer;
  }

  li button:hover {
    color: var(--danger);
  }

  input {
    width: 100%;
  }
</style>
