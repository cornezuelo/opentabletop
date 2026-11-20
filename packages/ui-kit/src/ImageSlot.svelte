<script lang="ts">
  import { IMAGE_SHAPES, type ImageShape } from './imageFrame'
  import ImagePicker from './ImagePicker.svelte'
  import Picture from './Picture.svelte'

  /**
   * Where a picture goes (a character's portrait, a party's banner, an item's picture), the size
   * of its use: empty, it says what's missing; with one, **Change** on hover. A click opens the
   * shared picker (`ImagePicker`); `onchange` gets the picture's id, or undefined for none.
   */
  let {
    image,
    shape,
    locale,
    title,
    size,
    disabled = false,
    onchange,
  }: {
    /** The library picture shown, by id. */
    image?: string
    shape: ImageShape
    locale: string
    /** The picker's title: what it's for (_Kael's portrait_). */
    title: string
    /** Its height in px (a portrait 96, a banner 64, an item 40, unless said). */
    size?: number
    disabled?: boolean
    onchange: (id: string | undefined) => void
  } = $props()

  const TEXT = {
    en: {
      add: {
        portrait: 'Add a portrait',
        banner: 'Add a banner',
        item: 'Add a picture',
        place: 'Add a picture',
        map: 'Add a picture',
      },
      change: 'Change',
    },
    es: {
      add: {
        portrait: 'Añadir un retrato',
        banner: 'Añadir un estandarte',
        item: 'Añadir una imagen',
        place: 'Añadir una imagen',
        map: 'Añadir una imagen',
      },
      change: 'Cambiar',
    },
  }
  const text = $derived(locale === 'es' ? TEXT.es : TEXT.en)
  const DEFAULT_SIZE = { portrait: 96, banner: 64, item: 40, place: 96, map: 96 }
  const height = $derived(size ?? DEFAULT_SIZE[shape])
  const width = $derived(Math.round(height * (IMAGE_SHAPES[shape] || 1.5)))
  /** Its own words fit only where there's room for them. */
  const roomy = $derived(height >= 64)

  let picking = $state(false)
</script>

<button
  class="slot"
  class:empty={!image}
  style:width="{width}px"
  style:height="{height}px"
  {disabled}
  aria-label={image ? `${title}: ${text.change}` : text.add[shape]}
  onclick={() => (picking = true)}
>
  {#if image}
    <Picture id={image} alt={title} face={IMAGE_SHAPES[shape] === 1}>
      <span class="plus" aria-hidden="true">+</span>
    </Picture>
    {#if roomy && !disabled}<span class="change">{text.change}</span>{/if}
  {:else}
    <span class="plus" aria-hidden="true">+</span>
    {#if roomy}<span class="what">{text.add[shape]}</span>{/if}
  {/if}
</button>

{#if picking}
  <ImagePicker
    bind:open={picking}
    {locale}
    {title}
    {shape}
    current={image}
    onpick={(id) => id !== image && onchange(id)}
  />
{/if}

<style>
  .slot {
    position: relative;
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
    padding: 0;
    overflow: hidden;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .slot.empty {
    border-style: dashed;
  }

  .slot:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }

  .slot:disabled {
    cursor: default;
  }

  .plus {
    font-size: 20px;
    line-height: 1;
  }

  .what {
    padding: 0 6px;
    font-size: 11px;
    line-height: 1.2;
    text-align: center;
  }

  .change {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 3px 0;
    font-size: 11px;
    color: var(--text);
    text-align: center;
    background: rgb(0 0 0 / 0.6);
    opacity: 0;
    transition: opacity 0.15s;
  }

  .slot:hover .change,
  .slot:focus-visible .change {
    opacity: 1;
  }
</style>
