<script lang="ts">
  import FieldEditor from './FieldEditor.svelte'
  import { AddAssetCommand, RemoveAssetCommand } from '../lib/commands/assets'
  import {
    BUILTIN_ICONS,
    builtinSvg,
    getBuiltinIcon,
    ICON_CATEGORIES,
    iconLabel,
    iconMatches,
    type IconCategory,
  } from '../lib/icons/registry'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { importImageFile, pickImageFiles } from '../lib/io/importImage'
  import IconStyleControls from './IconStyleControls.svelte'
  import { newId } from '../lib/model/id'
  import { formatCoord, parseKey } from '@open-tabletop/hex'
  import type { HexData, IconStyle } from '../lib/model/types'
  import { editor } from '../lib/store/editor.svelte'
  import { showToast, tooltip } from '@open-tabletop/ui-kit'

  type Filter = 'all' | IconCategory | 'custom'
  const filters: Filter[] = ['all', ...ICON_CATEGORIES, 'custom']

  let filter = $state<Filter>('all')
  let query = $state('')

  const assets = $derived.by(() => {
    void editor.revision
    return editor.map.assets
  })

  const builtins = $derived.by(() => {
    if (filter === 'custom') return []
    const q = query.trim().toLowerCase()
    return BUILTIN_ICONS.filter(
      (icon) => (filter === 'all' || icon.category === filter) && iconMatches(icon, q),
    )
  })

  const customs = $derived.by(() => {
    if (filter !== 'all' && filter !== 'custom') return []
    const q = query.trim().toLowerCase()
    return assets.filter((a) => !q || a.name.toLowerCase().includes(q))
  })

  /** The placed icon being edited (selected with the icon tool), if any. */
  const editing = $derived.by(() => {
    void editor.revision
    const key = editor.selectedIcon
    const icon = key ? editor.map.hexes[key]?.icon : undefined
    if (!key || !icon) return null
    return { key, icon, coord: formatCoord(parseKey(key), editor.grid.coordFormat, editor.grid) }
  })
  /** Icon highlighted in the palette: the edited one, or the one new icons will use. */
  const activeId = $derived(editing?.icon.id ?? editor.iconId)

  const selectedAsset = $derived(assets.find((a) => `asset:${a.id}` === activeId) ?? null)
  const selectedName = $derived.by(() => {
    const builtin = getBuiltinIcon(activeId)
    return builtin ? iconLabel(builtin) : (selectedAsset?.name ?? '')
  })

  function choose(id: string) {
    editor.iconId = id
    if (editing) editor.editHex(editing.key, (hex) => ({ ...hex, icon: { ...hex.icon!, id } }))
  }

  function changeStyle(style: IconStyle, live: boolean) {
    // New icons reuse the style, but not this icon's position.
    editor.iconStyle = { ...style, offset: undefined }
    if (!editing) return
    const { key, icon } = editing
    const update = (hex: HexData) => ({
      ...hex,
      icon: { ...style, id: icon.id, offset: icon.offset },
    })
    editor.previewHex(key, update)
    if (!live) editor.commitHex(key)
  }

  async function importIcons() {
    for (const file of await pickImageFiles()) {
      const result = await importImageFile(file)
      if ('error' in result) {
        showToast(`${file.name}: ${t(`icons.error.${result.error}` as MessageKey)}`, 'error')
        continue
      }
      const asset = { id: newId(), ...result }
      editor.execute(new AddAssetCommand(asset))
      editor.iconId = `asset:${asset.id}`
    }
  }

  function removeSelectedAsset() {
    if (!selectedAsset) return
    editor.execute(new RemoveAssetCommand(selectedAsset))
    editor.iconId = BUILTIN_ICONS[0].id
  }
</script>

<input
  type="search"
  bind:value={query}
  placeholder={t('icons.search')}
  aria-label={t('icons.search')}
/>

<div class="filters" role="radiogroup" aria-label={t('icons.category')}>
  {#each filters as f (f)}
    <button
      role="radio"
      aria-checked={filter === f}
      class:active={filter === f}
      onclick={() => (filter = f)}>{t(`iconCategories.${f}` as MessageKey)}</button
    >
  {/each}
</div>

<div class="grid" role="radiogroup" aria-label={t('panel.icons')}>
  {#each builtins as icon (icon.id)}
    <button
      role="radio"
      aria-checked={activeId === icon.id}
      class:active={activeId === icon.id}
      use:tooltip={iconLabel(icon)}
      aria-label={iconLabel(icon)}
      onclick={() => choose(icon.id)}
    >
      <!-- Bundled, trusted SVG markup. -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html builtinSvg(icon)}
    </button>
  {/each}
  {#each customs as asset (asset.id)}
    <button
      role="radio"
      aria-checked={activeId === `asset:${asset.id}`}
      class:active={activeId === `asset:${asset.id}`}
      use:tooltip={asset.name}
      aria-label={asset.name}
      onclick={() => choose(`asset:${asset.id}`)}
    >
      <img src={asset.dataUrl} alt="" />
    </button>
  {/each}
</div>
{#if builtins.length === 0 && customs.length === 0}
  <p class="help">{t('icons.empty')}</p>
{/if}

{#if editing}
  <div class="editing">
    <span>{t('icons.editing', { name: selectedName, coord: editing.coord })}</span>
    <button class="link" onclick={() => (editor.selectedIcon = null)}>{t('icons.deselect')}</button>
  </div>
{:else}
  <p class="selected">{t('icons.selected', { name: selectedName })}</p>
{/if}

<IconStyleControls
  style={editing ? editing.icon : editor.iconStyle}
  tintable={!selectedAsset}
  onchange={changeStyle}
/>

{#if editing}
  {@const where = editing.key}
  <FieldEditor
    scope="icon"
    fields={editing.icon.fields ?? []}
    help={t('fields.iconHelp')}
    onchange={(fields) =>
      editor.editHex(where, (hex) => ({
        ...hex,
        icon: { ...hex.icon!, fields: fields.length ? fields : undefined },
      }))}
  />
{/if}

<div class="actions">
  <button onclick={importIcons}>{t('icons.import')}</button>
  {#if selectedAsset}
    <button class="danger" onclick={removeSelectedAsset}>{t('icons.removeCustom')}</button>
  {/if}
</div>

<p class="help">{t('icons.help')}</p>
<p class="help credit">{t('icons.credit')}</p>

<style>
  input[type='search'] {
    width: 100%;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .filters button,
  .actions button {
    padding: 3px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    cursor: pointer;
  }

  .filters button.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 4px;
    max-height: 260px;
    padding-right: var(--scroll-room);
    overflow-y: auto;
  }

  .grid button {
    aspect-ratio: 1;
    padding: 5px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .grid button:hover {
    border-color: var(--text-muted);
  }

  .grid button.active {
    color: var(--accent);
    border-color: var(--accent);
  }

  .grid :global(svg),
  .grid img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .editing {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    color: var(--accent);
    background: var(--bg);
    border: 1px solid var(--accent);
    border-radius: 6px;
  }

  .selected {
    margin: 0;
    color: var(--accent);
    text-transform: capitalize;
  }

  .actions {
    display: flex;
    gap: 4px;
  }

  .actions button {
    border-radius: 6px;
  }

  .danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .credit {
    font-size: 11px;
  }
</style>
