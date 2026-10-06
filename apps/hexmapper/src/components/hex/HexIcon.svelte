<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { getBuiltinIcon, iconImage, iconLabel } from '../../lib/icons/registry'
  import { t } from '../../lib/i18n/index.svelte'
  import type { HexData, HexIcon, HexKey } from '../../lib/model/types'
  import IconStyleControls from '../IconStyleControls.svelte'
  import { editor } from '../../lib/store/editor.svelte'

  let { key, icon }: { key: HexKey; icon: HexIcon } = $props()

  let editing = $state(false)

  const image = $derived.by(() => {
    void editor.revision
    return iconImage(icon.id, editor.map.assets)
  })
  const label = $derived.by(() => {
    const builtin = getBuiltinIcon(icon.id)
    if (builtin) return iconLabel(builtin)
    return editor.map.assets.find((a) => `asset:${a.id}` === icon.id)?.name ?? icon.id
  })
</script>

<div class="field">
  <span>{t('hex.icon')}</span>
  <div class="row">
    {#if image}
      <img src={image.url} alt="" class:tint={image.tintable} />
    {/if}
    <span class="name">{label}</span>
    <button class="link" onclick={() => (editing = !editing)}
      >{editing ? t('hex.done') : t('iconStyle.edit')}</button
    >
    <button
      class="icon"
      use:tooltip={t('hex.remove')}
      aria-label="{t('hex.remove')}: {label}"
      onclick={() => editor.editHex(key, (h) => ({ ...h, icon: undefined }))}>✕</button
    >
  </div>
  {#if editing}
    <IconStyleControls
      style={icon}
      tintable={image?.tintable ?? true}
      onchange={(style, live) => {
        // Style only: the position stays.
        const update = (h: HexData) => ({
          ...h,
          icon: { ...style, id: icon.id, offset: icon.offset },
        })
        if (live) editor.previewHex(key, update)
        else {
          editor.previewHex(key, update)
          editor.commitHex(key)
        }
      }}
    />
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  /* Bundled icons are white; show them in the accent color on the dark panel. */
  img.tint {
    filter: brightness(0) saturate(100%) invert(72%) sepia(40%) saturate(600%) hue-rotate(5deg);
  }

  .name {
    flex: 1;
    color: var(--text);
    text-transform: capitalize;
  }

  .icon {
    height: 26px;
  }
</style>
