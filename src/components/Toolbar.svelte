<script lang="ts">
  import { t, type MessageKey } from '../lib/i18n/index.svelte'

  const tools: { id: string; label: MessageKey; glyph: string }[] = [
    { id: 'select', label: 'tools.select', glyph: '⬚' },
    { id: 'terrain', label: 'tools.terrain', glyph: '⬢' },
    { id: 'icon', label: 'tools.icon', glyph: '★' },
    { id: 'path', label: 'tools.path', glyph: '〰' },
    { id: 'text', label: 'tools.text', glyph: 'T' },
    { id: 'player', label: 'tools.player', glyph: '♞' },
  ]

  let active = $state('select')
</script>

<nav class="toolbar" aria-label={t('tools.label')}>
  {#each tools as tool (tool.id)}
    <button
      class:active={active === tool.id}
      title={t(tool.label)}
      aria-label={t(tool.label)}
      aria-pressed={active === tool.id}
      onclick={() => (active = tool.id)}
    >
      {tool.glyph}
    </button>
  {/each}
</nav>

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: var(--panel);
    border-right: 1px solid var(--panel-border);
  }

  button {
    width: 40px;
    height: 40px;
    font-size: 18px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--panel-border);
  }

  button.active {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
