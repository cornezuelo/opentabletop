<script lang="ts">
  import { appIconUrl } from '@open-tabletop/ui-kit'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { newMap, saveMap } from '../lib/io/actions.svelte'
  import { editor, type ToolId } from '../lib/store/editor.svelte'
  import { view } from '../lib/store/view'

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

  const actions: { label: MessageKey; glyph: string; run: () => void; enabled?: () => boolean }[] =
    [
      {
        label: 'actions.undo',
        glyph: '↶',
        run: () => editor.undo(),
        enabled: () => editor.canUndo,
      },
      {
        label: 'actions.redo',
        glyph: '↷',
        run: () => editor.redo(),
        enabled: () => editor.canRedo,
      },
      { label: 'actions.fit', glyph: '⛶', run: () => view.fit() },
      { label: 'actions.new', glyph: '✚', run: newMap },
      {
        label: 'actions.open',
        glyph: '📂',
        run: () => (editor.panelView = editor.panelView === 'library' ? 'tool' : 'library'),
      },
      { label: 'actions.save', glyph: '💾', run: saveMap },
      {
        label: 'actions.export',
        glyph: '⤓',
        run: () => (editor.panelView = editor.panelView === 'export' ? 'tool' : 'export'),
      },
    ]
</script>

<nav class="toolbar" aria-label={t('tools.label')}>
  {#each tools as tool (tool.id)}
    <button
      class:active={editor.tool === tool.id}
      title={t(tool.label)}
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

  <div class="spacer"></div>

  <button
    class:active={editor.panelView === 'settings'}
    title={t('panel.settings')}
    aria-label={t('panel.settings')}
    aria-pressed={editor.panelView === 'settings'}
    onclick={() => (editor.panelView = editor.panelView === 'settings' ? 'tool' : 'settings')}
    >⚙</button
  >
  <button
    class:active={editor.panelView === 'oracle'}
    title={t('actions.oracle')}
    aria-label={t('actions.oracle')}
    aria-pressed={editor.panelView === 'oracle'}
    onclick={() => (editor.panelView = editor.panelView === 'oracle' ? 'tool' : 'oracle')}
    ><img class="app" src={appIconUrl('oracle')} alt="" /></button
  >

  {#each actions as action (action.label)}
    <button
      title={t(action.label)}
      aria-label={t(action.label)}
      disabled={action.enabled ? !action.enabled() : false}
      onclick={action.run}
    >
      {action.glyph}
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

  .spacer {
    flex: 1;
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
