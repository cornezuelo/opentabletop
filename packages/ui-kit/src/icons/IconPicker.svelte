<script lang="ts">
  import { tooltip } from '../tooltip'
  import { vocabulary } from '../vocabulary'
  import {
    BUILTIN_ICONS,
    builtinSvg,
    ICON_CATEGORIES,
    iconLabel,
    iconMatches,
    type IconCategory,
  } from './index'

  /**
   * A compact icon picker: some categories by default (**Suggested**: characters and
   * creatures, as for tokens) with chips for the rest; searching the suggested ones looks
   * through every bundled icon. A host with images of its own (Map's imported ones) lists
   * them (`images`, chosen as `asset:<id>`) and imports one (`onupload`). With `none`, a first
   * choice clears the icon.
   */
  let {
    value,
    onchange,
    locale,
    categories = ['party', 'danger', 'modern', 'scifi'],
    none = false,
    images,
    onupload,
    label,
  }: {
    value: string | undefined
    onchange: (iconId: string | undefined) => void
    /** The UI's language, for the icons' names and the picker's words. */
    locale: string
    categories?: IconCategory[]
    none?: boolean
    /** The host's own images, each chosen as `asset:<id>`. */
    images?: { id: string; name: string; url: string }[]
    /** Imports an image of the host's (its button shown only then). */
    onupload?: () => void
    /** What the icon is for, for screen readers (_Token icon_). */
    label?: string
  } = $props()

  /** The picker's words: the UI's language's, else English. */
  const words = $derived(locale === 'es' ? vocabulary.es : vocabulary.en)
  type Filter = 'suggested' | 'all' | IconCategory | 'custom'
  const filters = $derived<Filter[]>([
    'suggested',
    'all',
    ...ICON_CATEGORIES,
    ...(images ? (['custom'] as const) : []),
  ])
  const filterName = (f: Filter) =>
    f === 'terrain' ? words.terms.terrain : words.icons.categories[f]
  let filter = $state<Filter>('suggested')
  let query = $state('')
  const shownImages = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (filter !== 'suggested' && filter !== 'all' && filter !== 'custom') return []
    return (images ?? []).filter((a) => !q || a.name.toLowerCase().includes(q))
  })
  const icons = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (filter === 'custom') return []
    const shown = (i: (typeof BUILTIN_ICONS)[number]) =>
      filter === 'all' ||
      (filter === 'suggested' ? !!q || categories.includes(i.category) : i.category === filter)
    return BUILTIN_ICONS.filter((i) => shown(i) && iconMatches(i, q, locale))
  })
</script>

<div class="picker">
  <input
    type="search"
    bind:value={query}
    placeholder={words.icons.search}
    aria-label={words.icons.search}
  />
  <div class="filters" role="radiogroup" aria-label={words.icons.category}>
    {#each filters as f (f)}
      <button
        type="button"
        role="radio"
        aria-checked={filter === f}
        class:active={filter === f}
        onclick={() => (filter = f)}>{filterName(f)}</button
      >
    {/each}
  </div>
  <div class="grid" role="radiogroup" aria-label={label ?? words.icons.icon}>
    {#if none}
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        class:active={!value}
        class="none"
        use:tooltip={words.icons.none}
        aria-label={words.icons.none}
        onclick={() => onchange(undefined)}>∅</button
      >
    {/if}
    {#each icons as icon (icon.id)}
      <button
        type="button"
        role="radio"
        aria-checked={value === icon.id}
        class:active={value === icon.id}
        use:tooltip={iconLabel(icon, locale)}
        aria-label={iconLabel(icon, locale)}
        onclick={() => onchange(icon.id)}
      >
        <!-- Bundled, trusted SVG markup. -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html builtinSvg(icon)}
      </button>
    {/each}
    {#each shownImages as image (image.id)}
      <button
        type="button"
        role="radio"
        aria-checked={value === `asset:${image.id}`}
        class:active={value === `asset:${image.id}`}
        use:tooltip={image.name}
        aria-label={image.name}
        onclick={() => onchange(`asset:${image.id}`)}
      >
        <img src={image.url} alt="" />
      </button>
    {/each}
  </div>
  {#if onupload}
    <button type="button" class="upload" onclick={onupload}>{words.icons.upload}</button>
  {/if}
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

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
