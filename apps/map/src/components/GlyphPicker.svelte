<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../lib/i18n/index.svelte'
  import { BUILTIN_ICONS, builtinSvg, iconLabel } from '../lib/icons/registry'
  import { iconImages, importIcons, takeIcon } from '../lib/io/icons.svelte'

  /**
   * Symbol of a terrain: the terrain set, the map's images and the library's icons, an
   * imported image or none.
   */
  let {
    value,
    color,
    onchange,
  }: { value: string | undefined; color: string; onchange: (glyph: string | undefined) => void } =
    $props()

  const icons = BUILTIN_ICONS.filter((i) => i.category === 'terrain')
  const assets = $derived(iconImages())

  function choose(glyph: string | undefined) {
    takeIcon(glyph)
    onchange(glyph)
  }

  async function upload() {
    const [id] = await importIcons()
    if (id) onchange(id)
  }
</script>

<div class="picker" style:--swatch={color}>
  <div class="grid" role="radiogroup" aria-label={t('terrainEditor.glyph')}>
    <button
      role="radio"
      aria-checked={!value}
      class:active={!value}
      class="none"
      use:tooltip={t('terrainEditor.noGlyph')}
      onclick={() => onchange(undefined)}>∅</button
    >
    {#each icons as icon (icon.id)}
      <button
        role="radio"
        aria-checked={value === icon.id}
        class:active={value === icon.id}
        use:tooltip={iconLabel(icon)}
        aria-label={iconLabel(icon)}
        onclick={() => choose(icon.id)}
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
        onclick={() => choose(`asset:${asset.id}`)}
      >
        <img src={asset.url} alt="" />
      </button>
    {/each}
  </div>
  <button class="upload" onclick={upload}>{t('terrainEditor.importGlyph')}</button>
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(30px, 1fr));
    gap: 3px;
  }

  .grid button {
    aspect-ratio: 1;
    padding: 3px;
    color: var(--text);
    background: var(--swatch);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .grid button.none {
    color: var(--text-muted);
    background: var(--panel);
  }

  .grid button.active {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
  }

  .grid :global(svg),
  .grid img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.6));
  }

  .upload {
    align-self: flex-start;
    padding: 3px 8px;
    font-size: 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    cursor: pointer;
  }
</style>
