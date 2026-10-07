<script lang="ts">
  import { appIconUrl, tooltip } from '@open-tabletop/ui-kit'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { editor, type ToolId } from '../lib/store/editor.svelte'

  /** The tools, on the left of the map: what clicking on the map does. */

  const tools: { id: ToolId; label: MessageKey; glyph: string }[] = [
    { id: 'select', label: 'tools.select', glyph: '⬚' },
    { id: 'terrain', label: 'tools.terrain', glyph: '⬢' },
    { id: 'region', label: 'tools.region', glyph: '⛉' },
    { id: 'path', label: 'tools.path', glyph: '〰' },
    { id: 'icon', label: 'tools.icon', glyph: '♜' },
    { id: 'text', label: 'tools.text', glyph: 'T' },
    { id: 'token', label: 'tools.token', glyph: '♟' },
    { id: 'play', label: 'tools.play', glyph: '▶' },
  ]
</script>

<nav class="toolbar" aria-label={t('tools.label')}>
  {#each tools as tool (tool.id)}
    <button
      class:active={editor.tool === tool.id}
      use:tooltip={t(tool.label)}
      aria-label={t(tool.label)}
      aria-pressed={editor.tool === tool.id}
      onclick={() => {
        editor.tool = tool.id
        editor.panelView = 'tool'
      }}
    >
      {tool.glyph}
    </button>
  {/each}
  <!-- The Oracle is used while mapping and playing: with the tools, under Play. -->
  <button
    class:active={editor.panelView === 'oracle'}
    use:tooltip={t('actions.oracle')}
    aria-label={t('actions.oracle')}
    aria-pressed={editor.panelView === 'oracle'}
    onclick={() => (editor.panelView = editor.panelView === 'oracle' ? 'tool' : 'oracle')}
    ><img class="app" src={appIconUrl('oracle')} alt="" /></button
  >
  <!-- The world clock: the campaign's date, events and progress clocks. -->
  <button
    class:active={editor.panelView === 'world'}
    use:tooltip={t('actions.world')}
    aria-label={t('actions.world')}
    aria-pressed={editor.panelView === 'world'}
    onclick={() => (editor.panelView = editor.panelView === 'world' ? 'tool' : 'world')}>☾</button
  >
</nav>

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    /* Short windows: the buttons scroll instead of being cut off. */
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--panel-border) var(--panel);
    background: var(--panel);
    border-right: 1px solid var(--panel-border);
  }

  button {
    flex: none;
    width: 40px;
    height: 40px;
    font-size: 18px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: var(--panel-border);
  }

  button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .app {
    display: block;
    width: 22px;
    height: 22px;
    margin: auto;
  }

  button.active {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
