<script lang="ts">
  import { appGlyphUrl, tooltip } from '@open-tabletop/ui-kit'
  import LineIcon, { type LineIconName } from './LineIcon.svelte'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { editor, type ToolId } from '../lib/store/editor.svelte'

  /** The tools, on the left of the map: what clicking on the map does. */

  type Tool = { id: ToolId; label: MessageKey; glyph: LineIconName }
  const select: Tool = { id: 'select', label: 'tools.select', glyph: 'select' }
  /** By what they're for, a line between groups: the land, what links it, what stands on it. */
  const editing: Tool[][] = [
    [select],
    [
      { id: 'terrain', label: 'tools.terrain', glyph: 'terrain' },
      { id: 'region', label: 'tools.region', glyph: 'region' },
      { id: 'path', label: 'tools.path', glyph: 'path' },
      { id: 'wall', label: 'tools.wall', glyph: 'wall' },
    ],
    [{ id: 'connection', label: 'tools.connection', glyph: 'connection' }],
    [
      { id: 'icon', label: 'tools.icon', glyph: 'icon' },
      { id: 'text', label: 'tools.text', glyph: 'text' },
      { id: 'token', label: 'tools.token', glyph: 'token' },
    ],
  ]
  const playing: Tool[][] = [[select, { id: 'play', label: 'tools.trip', glyph: 'trip' }]]
  const groups = $derived(editor.mode === 'play' ? playing : editing)
  /** World and the Oracle take the panel: then they, not the tool, are what's lit. */
  const inTool = $derived(editor.panelView !== 'world' && editor.panelView !== 'oracle')
</script>

<nav class="toolbar" aria-label={t('tools.label')}>
  {#each groups as group, g (g)}
    {#if g > 0}<span class="sep" aria-hidden="true"></span>{/if}
    {#each group as tool (tool.id)}
      <button
        class:active={inTool && editor.tool === tool.id}
        use:tooltip={t(tool.label)}
        aria-label={t(tool.label)}
        aria-pressed={inTool && editor.tool === tool.id}
        onclick={() => {
          editor.tool = tool.id
          editor.panelView = 'tool'
        }}><LineIcon name={tool.glyph} /></button
      >
    {/each}
  {/each}
  <span class="sep" aria-hidden="true"></span>
  <!-- The world clock (the campaign's date, events and progress clocks), next to Play. -->
  <button
    class:active={editor.panelView === 'world'}
    use:tooltip={t('actions.world')}
    aria-label={t('actions.world')}
    aria-pressed={editor.panelView === 'world'}
    onclick={() => (editor.panelView = editor.panelView === 'world' ? 'tool' : 'world')}
    ><LineIcon name="world" /></button
  >
  <!-- The Oracle is used while mapping and playing: with the tools, under Play and the World. -->
  <button
    class:active={editor.panelView === 'oracle'}
    use:tooltip={t('actions.oracle')}
    aria-label={t('actions.oracle')}
    aria-pressed={editor.panelView === 'oracle'}
    onclick={() => (editor.panelView = editor.panelView === 'oracle' ? 'tool' : 'oracle')}
    ><!-- The app's icon as a mask, so it takes the text colour like the other glyphs. -->
    <span class="app" style:--icon={`url("${appGlyphUrl('oracle')}")`}></span></button
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

  .sep {
    flex: none;
    height: 1px;
    margin: 2px 6px;
    background: var(--panel-border);
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
    background: currentColor;
    mask: var(--icon) center / contain no-repeat;
  }

  button.active {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
