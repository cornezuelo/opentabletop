<script lang="ts">
  import { showToast, tooltip } from '@open-tabletop/ui-kit'
  import { AddAssetCommand } from '../../lib/commands/assets'
  import { t, type MessageKey } from '../../lib/i18n/index.svelte'
  import {
    BUILTIN_ICONS,
    builtinSvg,
    ICON_CATEGORIES,
    iconLabel,
    iconMatches,
  } from '../../lib/icons/registry'
  import { importImageFile, pickImageFiles } from '../../lib/io/importImage'
  import { newId } from '../../lib/model/id'
  import { editor } from '../../lib/store/editor.svelte'

  import type { IconCategory } from '../../lib/icons/registry'

  /**
   * A compact icon picker: some categories by default (**Suggested**: characters and
   * creatures for tokens) with chips for the rest, as in the Icons panel; searching the
   * suggested ones looks through every bundled icon. The map's imported images and a button
   * to import one. With `none`, a first choice clears the icon.
   */
  let {
    value,
    onchange,
    categories = ['party', 'danger', 'modern', 'scifi'],
    none = false,
  }: {
    value: string | undefined
    onchange: (iconId: string | undefined) => void
    categories?: IconCategory[]
    none?: boolean
  } = $props()

  type Filter = 'suggested' | 'all' | IconCategory | 'custom'
  const filters: Filter[] = ['suggested', 'all', ...ICON_CATEGORIES, 'custom']
  let filter = $state<Filter>('suggested')
  let query = $state('')
  const assets = $derived.by(() => {
    void editor.revision
    const q = query.trim().toLowerCase()
    if (filter !== 'suggested' && filter !== 'all' && filter !== 'custom') return []
    return editor.map.assets.filter((a) => !q || a.name.toLowerCase().includes(q))
  })
  const icons = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (filter === 'custom') return []
    const shown = (i: (typeof BUILTIN_ICONS)[number]) =>
      filter === 'all' ||
      (filter === 'suggested' ? !!q || categories.includes(i.category) : i.category === filter)
    return BUILTIN_ICONS.filter((i) => shown(i) && iconMatches(i, q))
  })

  async function upload() {
    const [file] = await pickImageFiles()
    if (!file) return
    const result = await importImageFile(file)
    if ('error' in result) {
      showToast(`${file.name}: ${t(`icons.error.${result.error}` as MessageKey)}`, 'error')
      return
    }
    const asset = { id: newId(), ...result }
    editor.execute(new AddAssetCommand(asset))
    onchange(`asset:${asset.id}`)
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
<div class="grid" role="radiogroup" aria-label={t('tokens.icon')}>
  {#if none}
    <button
      role="radio"
      aria-checked={!value}
      class:active={!value}
      class="none"
      use:tooltip={t('hex.noIcon')}
      aria-label={t('hex.noIcon')}
      onclick={() => onchange(undefined)}>∅</button
    >
  {/if}
  {#each icons as icon (icon.id)}
    <button
      role="radio"
      aria-checked={value === icon.id}
      class:active={value === icon.id}
      use:tooltip={iconLabel(icon)}
      aria-label={iconLabel(icon)}
      onclick={() => onchange(icon.id)}
    >
      <!-- Bundled, trusted SVG markup. -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html builtinSvg(icon)}
    </button>
  {/each}
  {#each assets as asset (asset.id)}
    <button
      role="radio"
      aria-checked={value === `asset:${asset.id}`}
      class:active={value === `asset:${asset.id}`}
      use:tooltip={asset.name}
      aria-label={asset.name}
      onclick={() => onchange(`asset:${asset.id}`)}
    >
      <img src={asset.dataUrl} alt="" />
    </button>
  {/each}
</div>
<button class="upload" onclick={upload}>{t('tokens.upload')}</button>

<style>
  input[type='search'] {
    width: 100%;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .filters button {
    padding: 2px 7px;
    font-size: 11px;
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
    grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
    gap: 4px;
    max-height: 160px;
    padding-right: var(--scroll-room);
    overflow-y: auto;
  }

  .grid button {
    aspect-ratio: 1;
    padding: 4px;
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .grid button.none {
    color: var(--text-muted);
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

  .upload {
    align-self: flex-start;
    padding: 3px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    cursor: pointer;
  }
</style>
