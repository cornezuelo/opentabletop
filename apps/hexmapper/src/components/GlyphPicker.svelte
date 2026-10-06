<script lang="ts">
  import { showToast, tooltip } from '@open-tabletop/ui-kit'
  import { AddAssetCommand } from '../lib/commands/assets'
  import { t, type MessageKey } from '../lib/i18n/index.svelte'
  import { BUILTIN_ICONS, builtinSvg, iconLabel } from '../lib/icons/registry'
  import { importImageFile, pickImageFiles } from '../lib/io/importImage'
  import { newId } from '../lib/model/id'
  import { editor } from '../lib/store/editor.svelte'

  /** Symbol of a terrain: the terrain set, the map's images, an imported image or none. */
  let {
    value,
    color,
    onchange,
  }: { value: string | undefined; color: string; onchange: (glyph: string | undefined) => void } =
    $props()

  const icons = BUILTIN_ICONS.filter((i) => i.category === 'terrain')
  const assets = $derived.by(() => {
    void editor.revision
    return editor.map.assets
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
    border-radius: 5px;
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
