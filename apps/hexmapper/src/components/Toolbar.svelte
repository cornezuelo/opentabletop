<script lang="ts">
  import { AppSwitcher, appIconUrl, tooltip } from '@open-tabletop/ui-kit'
  import LineIcon from './LineIcon.svelte'
  import { getLocale, t, type MessageKey } from '../lib/i18n/index.svelte'
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
        glyph: 'folder',
        run: () => (editor.panelView = editor.panelView === 'library' ? 'tool' : 'library'),
      },
      { label: 'actions.save', glyph: 'save', run: saveMap },
      {
        label: 'actions.export',
        glyph: '⤓',
        run: () => (editor.panelView = editor.panelView === 'export' ? 'tool' : 'export'),
      },
    ]
</script>

<nav class="toolbar" aria-label={t('tools.label')}>
  <!-- The app, top left like in every app: its icon (the open map's name) and the app switcher. -->
  <img
    class="brand"
    src={appIconUrl('hexmapper')}
    alt={t('app.title')}
    use:tooltip={editor.meta.name ? `${t('app.title')} · ${editor.meta.name}` : t('app.title')}
  />
  <AppSwitcher current="hexmapper" locale={getLocale()} compact />
  <hr />
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

  <div class="spacer"></div>

  <button
    class:active={editor.panelView === 'settings'}
    use:tooltip={t('panel.settings')}
    aria-label={t('panel.settings')}
    aria-pressed={editor.panelView === 'settings'}
    onclick={() => (editor.panelView = editor.panelView === 'settings' ? 'tool' : 'settings')}
    >⚙</button
  >
  <button
    class:active={editor.panelView === 'layers'}
    use:tooltip={t('panel.layers')}
    aria-label={t('panel.layers')}
    aria-pressed={editor.panelView === 'layers'}
    onclick={() => (editor.panelView = editor.panelView === 'layers' ? 'tool' : 'layers')}>▤</button
  >
  <button
    class:active={editor.panelView === 'help'}
    use:tooltip={t('actions.help')}
    aria-label={t('actions.help')}
    aria-pressed={editor.panelView === 'help'}
    onclick={() => (editor.panelView = editor.panelView === 'help' ? 'tool' : 'help')}>?</button
  >

  {#each actions as action (action.label)}
    <button
      use:tooltip={t(action.label)}
      aria-label={t(action.label)}
      disabled={action.enabled ? !action.enabled() : false}
      onclick={action.run}
    >
      {#if action.glyph === 'folder' || action.glyph === 'save'}
        <LineIcon name={action.glyph} />
      {:else}
        {action.glyph}
      {/if}
    </button>
  {/each}
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

  .spacer {
    flex: 1;
  }

  .brand {
    width: 24px;
    height: 24px;
    margin: 6px auto 2px;
  }

  hr {
    width: 100%;
    margin: 2px 0;
    border: none;
    border-top: 1px solid var(--panel-border);
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
