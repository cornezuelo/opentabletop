<script lang="ts">
  import { cachedImage, onPictureChange } from './imageCache'
  import ImagePicker from './ImagePicker.svelte'
  import ImageSlot from './ImageSlot.svelte'
  import Picture from './Picture.svelte'
  import { IMAGE_SHAPES, type ImageShape } from './imageFrame'

  /**
   * A picture of the image library shown whole, in its own proportions, no taller than
   * `maxHeight` (docs/character-pictures.md §10): a click shows it full size; **Change** and,
   * for a portrait or an item (shown small by their face), **Frame the face** under it. Without one, the slot to add one.
   */
  let {
    image,
    locale,
    title,
    shape = 'portrait',
    maxHeight = 320,
    disabled = false,
    empty = 'slot',
    onaspect,
    onchange,
  }: {
    image?: string
    locale: string
    /** What it's for (_Mara's portrait_). */
    title: string
    shape?: ImageShape
    maxHeight?: number
    disabled?: boolean
    /** Without a picture: the slot to add one, or only a quiet line (_+ Add a picture_). */
    empty?: 'slot' | 'line'
    /** Told the picture's width over its height once read (undefined without one), for a layout to follow. */
    onaspect?: (aspect: number | undefined) => void
    onchange: (id: string | undefined) => void
  } = $props()

  let version = $state(0)
  $effect(() => onPictureChange((changed) => changed === image && version++))
  $effect(() => {
    const wanted = image
    void version
    if (!wanted) return void onaspect?.(undefined)
    let live = true
    void cachedImage(wanted).then((read) => {
      if (live) onaspect?.(read && read.height ? read.width / read.height : undefined)
    })
    return () => (live = false)
  })

  const TEXT = {
    en: { change: 'Change', face: 'Frame the face', add: '+ Add a picture' },
    es: { change: 'Cambiar', face: 'Encuadrar la cara', add: '+ Añadir una imagen' },
  }
  const text = $derived(locale === 'es' ? TEXT.es : TEXT.en)

  let picking = $state(false)
  let start = $state<'choose' | 'face'>('choose')
  let large = $state<HTMLDialogElement>()
</script>

{#if image}
  <div class="whole">
    <button class="shown" style:max-height="{maxHeight}px" onclick={() => large?.showModal()}>
      <Picture id={image} alt={title} whole />
    </button>
    {#if !disabled}
      <p class="actions">
        <button
          class="link"
          onclick={() => {
            start = 'choose'
            picking = true
          }}>{text.change}</button
        >
        {#if IMAGE_SHAPES[shape] === 1}
          ·
          <button
            class="link"
            onclick={() => {
              start = 'face'
              picking = true
            }}>{text.face}</button
          >
        {/if}
      </p>
    {/if}
  </div>
  <dialog class="large" bind:this={large} aria-label={title} onclick={() => large?.close()}>
    <Picture id={image} alt={title} whole />
  </dialog>
  <ImagePicker
    bind:open={picking}
    {locale}
    {title}
    {shape}
    current={image}
    {start}
    onpick={onchange}
  />
{:else if empty === 'line'}
  {#if !disabled}
    <button
      class="link add"
      onclick={() => {
        start = 'choose'
        picking = true
      }}>{text.add}</button
    >
    <ImagePicker bind:open={picking} {locale} {title} {shape} {start} onpick={onchange} />
  {/if}
{:else}
  <ImageSlot {image} {shape} {locale} {disabled} {title} {onchange} />
{/if}

<style>
  .whole {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    min-width: 0;
  }

  .shown {
    display: flex;
    justify-content: center;
    max-width: 100%;
    padding: 0;
    overflow: hidden;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: zoom-in;
  }

  .shown :global(img) {
    max-height: inherit;
  }

  .add {
    align-self: flex-start;
    font-size: 12px;
  }

  .actions {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .large {
    max-width: 96vw;
    max-height: 96vh;
    padding: 0;
    background: none;
    border: none;
    cursor: zoom-out;
  }

  .large::backdrop {
    background: rgb(0 0 0 / 85%);
  }

  .large :global(img) {
    max-width: 96vw;
    max-height: 96vh;
  }
</style>
