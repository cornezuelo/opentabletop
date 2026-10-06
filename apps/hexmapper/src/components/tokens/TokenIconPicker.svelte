<script lang="ts">
  import { showToast } from '@open-tabletop/ui-kit'
  import { AddAssetCommand } from '../../lib/commands/assets'
  import { t, type MessageKey } from '../../lib/i18n/index.svelte'
  import { BUILTIN_ICONS, builtinSvg, iconLabel } from '../../lib/icons/registry'
  import { importImageFile, pickImageFiles } from '../../lib/io/importImage'
  import { newId } from '../../lib/model/id'
  import { editor } from '../../lib/store/editor.svelte'

  /**
   * Icons for tokens: characters and creatures by default, any bundled icon when
   * searching, plus the map's imported images (and a button to import one).
   */
  let { value, onchange }: { value: string; onchange: (iconId: string) => void } = $props()

  let query = $state('')
  const assets = $derived.by(() => {
    void editor.revision
    return editor.map.assets
  })
  const icons = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return q
      ? BUILTIN_ICONS.filter((i) => iconLabel(i).includes(q))
      : BUILTIN_ICONS.filter((i) => i.category === 'party' || i.category === 'danger')
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
<div class="grid" role="radiogroup" aria-label={t('tokens.icon')}>
  {#each icons as icon (icon.id)}
    <button
      role="radio"
      aria-checked={value === icon.id}
      class:active={value === icon.id}
      title={iconLabel(icon)}
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
      title={asset.name}
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

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
    gap: 4px;
    max-height: 160px;
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
