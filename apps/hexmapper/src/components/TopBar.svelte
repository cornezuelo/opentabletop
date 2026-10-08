<script lang="ts">
  import { AppBrand, AppSwitcher, PreferencesButton, tooltip } from '@open-tabletop/ui-kit'
  import LineIcon from './LineIcon.svelte'
  import {
    getLocale,
    locales,
    setLocale,
    t,
    type Locale,
    type MessageKey,
  } from '../lib/i18n/index.svelte'
  import { newMap, saveMap } from '../lib/io/actions.svelte'
  import { editor, type PanelView } from '../lib/store/editor.svelte'
  import { view } from '../lib/store/view'

  /**
   * The bar across the top, like in every app: the app and the app switcher on the left;
   * what you do with the map and the panel's views on the right. The open map's name goes
   * in the window's title ("Hexmapper - The Grey Marches").
   */
  $effect(() => {
    const name = editor.meta.name.trim()
    document.title = name ? `${t('app.title')} - ${name}` : t('app.title')
  })
  const toggle = (panel: PanelView) => () =>
    (editor.panelView = editor.panelView === panel ? 'tool' : panel)

  type Action = {
    label: MessageKey
    glyph: string
    run: () => void
    enabled?: () => boolean
    /** A view of the side panel: shown pressed while it's open. */
    panel?: PanelView
  }
  const groups: Action[][] = [
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
    ],
    [
      { label: 'actions.new', glyph: '✚', run: newMap },
      { label: 'actions.open', glyph: 'folder', run: toggle('library'), panel: 'library' },
      { label: 'actions.save', glyph: 'save', run: saveMap },
      { label: 'actions.export', glyph: '⤓', run: toggle('export'), panel: 'export' },
    ],
    [
      { label: 'panel.layers', glyph: '▤', run: toggle('layers'), panel: 'layers' },
      { label: 'panel.settings', glyph: 'map', run: toggle('settings'), panel: 'settings' },
      { label: 'actions.help', glyph: '?', run: toggle('help'), panel: 'help' },
    ],
  ]
</script>

<header class="bar">
  <span class="name"><AppBrand app="hexmapper" name={t('app.title')} /></span>
  <AppSwitcher current="hexmapper" locale={getLocale()} />
  <div class="spacer"></div>
  {#each groups as group, g (g)}
    {#if g > 0}<span class="sep" aria-hidden="true"></span>{/if}
    {#each group as action (action.label)}
      <!-- Preferences next to Help, as in every app. -->
      {#if action.label === 'actions.help'}
        <PreferencesButton
          locale={getLocale()}
          {locales}
          onlocale={(locale) => setLocale(locale as Locale)}
        />
      {/if}
      <button
        class:active={!!action.panel && editor.panelView === action.panel}
        use:tooltip={t(action.label)}
        aria-label={t(action.label)}
        aria-pressed={action.panel ? editor.panelView === action.panel : undefined}
        disabled={action.enabled ? !action.enabled() : false}
        onclick={action.run}
      >
        {#if action.glyph === 'folder' || action.glyph === 'save' || action.glyph === 'map'}
          <LineIcon name={action.glyph} />
        {:else}
          {action.glyph}
        {/if}
      </button>
    {/each}
  {/each}
</header>

<style>
  .bar {
    display: flex;
    gap: 4px;
    align-items: center;
    min-width: 0;
    padding: 6px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--panel-border);
  }

  .bar :global(.brand) {
    margin-right: 4px;
  }

  /* Narrow windows: the app's icon without its name, and the bar scrolls if needed. */
  @media (max-width: 760px) {
    .bar {
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .name :global(.brand > span) {
      display: none;
    }
  }

  .spacer {
    flex: 1;
  }

  .sep {
    width: 1px;
    height: 20px;
    margin: 0 4px;
    background: var(--panel-border);
  }

  button {
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 16px;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--panel-border);
  }

  button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  button.active {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
