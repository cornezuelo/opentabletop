<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'

  /** Swatches plus a free color input. With `auto`, an "Auto" option maps to undefined. */
  let {
    value,
    auto = false,
    onchange,
  }: {
    value: string | undefined
    auto?: boolean
    onchange: (color: string | undefined) => void
  } = $props()

  const SWATCHES = ['#1b1a17', '#f4eedd', '#8b1e1e', '#c8a24a', '#2f5d8a', '#3d6b35', '#5b3a6e']
</script>

<div class="swatches">
  {#if auto}
    <button
      class="auto"
      class:active={!value}
      title={t('iconStyle.auto')}
      onclick={() => onchange(undefined)}>{t('iconStyle.auto')}</button
    >
  {/if}
  {#each SWATCHES as color (color)}
    <button
      class="swatch"
      class:active={value === color}
      style:background={color}
      title={color}
      aria-label={color}
      onclick={() => onchange(color)}
    ></button>
  {/each}
  <input
    type="color"
    value={value ?? '#1b1a17'}
    title={t('iconStyle.custom')}
    aria-label={t('iconStyle.custom')}
    onchange={(e) => onchange(e.currentTarget.value)}
  />
</div>

<style>
  .swatches {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .swatch {
    width: 22px;
    height: 22px;
    border: 1px solid var(--panel-border);
    border-radius: 50%;
    cursor: pointer;
  }

  .swatch.active,
  .auto.active {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .auto {
    padding: 2px 8px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 999px;
    cursor: pointer;
  }

  input[type='color'] {
    width: 26px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
