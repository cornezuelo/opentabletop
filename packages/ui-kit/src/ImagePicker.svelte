<script lang="ts">
  import {
    allImages,
    deleteImage,
    IMAGE_FORMAT,
    putImage,
    readImage,
    type LibraryImage,
  } from '@open-tabletop/storage'
  import { confirmAction } from './dialog.svelte'
  import { drawFramed, ImageFileError, pictureIn, readImageFile, releaseImage } from './imageFile'
  import {
    clampFraming,
    coverScale,
    FRAMED,
    IMAGE_SHAPES,
    imageName,
    MAX_ZOOM,
    type Framing,
    type ImageShape,
  } from './imageFrame'
  import TagInput from './TagInput.svelte'
  import { showToast } from './toasts.svelte'
  import { tooltip } from './tooltip'

  /**
   * Choosing a picture from the image library, shared by every app (docs/character-pictures.md
   * §9): the library's pictures (those added for this use first), searched by name or tag, the
   * one chosen large with its name and tags; a new one uploaded, dropped or pasted, framed in
   * the slot's shape (moved, zoomed, turned, flipped) and kept shrunk. `onpick` gets the id
   * chosen, or undefined for none.
   */
  let {
    open = $bindable(false),
    locale,
    title,
    shape,
    current,
    onpick,
  }: {
    open?: boolean
    locale: string
    /** What it's for (_Kael's portrait_). */
    title: string
    shape: ImageShape
    /** The picture there now, chosen when it opens. */
    current?: string
    onpick: (id: string | undefined) => void
  } = $props()

  const TEXT = {
    en: {
      search: 'Search by name or tag',
      forUse: { portrait: 'Portraits', banner: 'Banners', item: 'Items' },
      all: 'All',
      upload: 'Upload an image…',
      drop: 'Drop or paste a picture here, or upload one.',
      empty: 'No pictures yet.',
      none: 'Nothing matches.',
      name: 'Name',
      tags: 'Tags',
      tagsHint: 'Words to find it by',
      remove: 'Remove {name}',
      size: '{width} × {height} px',
      delete: 'Delete…',
      deleteMessage:
        'Delete “{name}” from the library? Whatever shows it (a character, a map…) will show nothing in its place. This can’t be undone.',
      deleteConfirm: 'Delete',
      clear: {
        portrait: 'Remove the portrait',
        banner: 'Remove the banner',
        item: 'Remove the picture',
      },
      cancel: 'Cancel',
      use: 'Use this one',
      frameTitle: 'Frame the picture',
      frameHint: 'Drag it to place it; the wheel or the slider zooms.',
      zoom: 'Zoom',
      left: 'Turn left',
      right: 'Turn right',
      flip: 'Flip',
      preview: 'As it will look',
      back: 'Back',
      add: 'Add',
      svg: 'SVG pictures aren’t taken: they may hold scripts. Use PNG, JPEG or WebP.',
      notImage: 'That file isn’t a picture.',
      unreadable: 'That picture could not be read.',
      failed: 'It could not be kept: {error}',
    },
    es: {
      search: 'Buscar por nombre o etiqueta',
      forUse: { portrait: 'Retratos', banner: 'Estandartes', item: 'Objetos' },
      all: 'Todas',
      upload: 'Subir una imagen…',
      drop: 'Suelta o pega aquí una imagen, o súbela.',
      empty: 'Aún no hay imágenes.',
      none: 'Nada coincide.',
      name: 'Nombre',
      tags: 'Etiquetas',
      tagsHint: 'Palabras para encontrarla',
      remove: 'Quitar {name}',
      size: '{width} × {height} px',
      delete: 'Borrar…',
      deleteMessage:
        '¿Borrar «{name}» de la biblioteca? Lo que la muestre (un personaje, un mapa…) se quedará sin imagen. No se puede deshacer.',
      deleteConfirm: 'Borrar',
      clear: {
        portrait: 'Quitar el retrato',
        banner: 'Quitar el estandarte',
        item: 'Quitar la imagen',
      },
      cancel: 'Cancelar',
      use: 'Usar esta',
      frameTitle: 'Encuadrar la imagen',
      frameHint: 'Arrástrala para colocarla; la rueda o la barra acercan.',
      zoom: 'Zoom',
      left: 'Girar a la izquierda',
      right: 'Girar a la derecha',
      flip: 'Voltear',
      preview: 'Así se verá',
      back: 'Atrás',
      add: 'Añadir',
      svg: 'Las imágenes SVG no se aceptan: pueden llevar scripts. Usa PNG, JPEG o WebP.',
      notImage: 'Ese archivo no es una imagen.',
      unreadable: 'No se ha podido leer esa imagen.',
      failed: 'No se ha podido guardar: {error}',
    },
  }
  const text = $derived(locale === 'es' ? TEXT.es : TEXT.en)
  const fill = (s: string, values: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''))
  const aspect = $derived(IMAGE_SHAPES[shape])

  let dialog = $state<HTMLDialogElement>()
  let fileInput = $state<HTMLInputElement>()
  let step = $state<'choose' | 'frame'>('choose')
  let images = $state<LibraryImage[]>([])
  let query = $state('')
  let scope = $state<'use' | 'all'>('use')
  let selected = $state<string>()
  let dragOver = $state(false)

  async function load() {
    images = (await allImages()).flatMap((e) => readImage(e) ?? [])
  }

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) {
      step = 'choose'
      query = ''
      selected = current
      void load().then(() => {
        // Pictures for this use first; all of them when there are none.
        scope = images.some((i) => i.use === shape) ? 'use' : 'all'
      })
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  })

  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return images
      .filter((i) => scope === 'all' || i.use === shape)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q)))
      .sort((a, b) => Number(b.use === shape) - Number(a.use === shape))
  })
  const chosen = $derived(images.find((i) => i.id === selected))
  const allTags = $derived([...new Set(images.flatMap((i) => i.tags))].sort())

  function close() {
    open = false
  }
  function pick(id: string | undefined) {
    onpick(id)
    close()
  }

  async function save(image: LibraryImage, change: Partial<LibraryImage>) {
    const next = { ...image, ...change, modified: new Date().toISOString() }
    images = images.map((i) => (i.id === image.id ? next : i))
    try {
      await putImage(next)
    } catch (e) {
      showToast(fill(text.failed, { error: String(e) }), 'error')
    }
  }

  async function remove(image: LibraryImage) {
    const sure = await confirmAction(fill(text.deleteMessage, { name: image.name }), {
      confirm: text.deleteConfirm,
    })
    if (!sure) return
    await deleteImage(image.id)
    images = images.filter((i) => i.id !== image.id)
    if (selected === image.id) selected = undefined
    // What showed it shows nothing now.
    if (current === image.id) onpick(undefined)
  }

  // Framing an upload.
  let source = $state<HTMLImageElement>()
  let framing = $state<Framing>(FRAMED)
  let newName = $state('')
  const sourceSize = $derived(
    source ? { width: source.naturalWidth, height: source.naturalHeight } : { width: 1, height: 1 },
  )
  /** The frame's size on screen. */
  const frameWidth = $derived(aspect > 1 ? 480 : 300)
  const frameHeight = $derived(Math.round(frameWidth / aspect))
  const previewWidth = $derived(aspect > 1 ? 192 : 96)

  async function upload(file: File | undefined) {
    if (!file) return
    try {
      releaseImage(source)
      source = await readImageFile(file)
    } catch (e) {
      const code = e instanceof ImageFileError ? e.code : 'unreadable'
      showToast(text[code], 'error')
      return
    }
    framing = FRAMED
    newName = imageName(file.name)
    step = 'frame'
  }

  const setFraming = (next: Partial<Framing>) =>
    (framing = clampFraming(sourceSize, aspect, { ...framing, ...next }))

  /** How the picture is drawn in a frame `width` px wide: the same as it will be kept. */
  function placed(width: number) {
    const height = width / aspect
    const scale = coverScale(sourceSize, { width, height }, framing)
    return [
      `translate(${framing.x * width}px, ${framing.y * height}px)`,
      framing.flip ? 'scaleX(-1)' : '',
      `rotate(${framing.turns * 90}deg)`,
      `scale(${scale})`,
      'translate(-50%, -50%)',
    ].join(' ')
  }

  let dragging: { x: number; y: number } | undefined
  function onpointerdown(e: PointerEvent) {
    dragging = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onpointermove(e: PointerEvent) {
    if (!dragging) return
    setFraming({
      x: framing.x + (e.clientX - dragging.x) / frameWidth,
      y: framing.y + (e.clientY - dragging.y) / frameHeight,
    })
    dragging = { x: e.clientX, y: e.clientY }
  }
  function onwheel(e: WheelEvent) {
    e.preventDefault()
    setFraming({ zoom: framing.zoom * Math.exp(-e.deltaY * 0.0015) })
  }

  async function add() {
    if (!source) return
    try {
      const drawn = drawFramed(source, aspect, framing)
      const image: LibraryImage = {
        id: crypto.randomUUID(),
        name: newName.trim() || text.forUse[shape],
        modified: new Date().toISOString(),
        format: IMAGE_FORMAT,
        ...drawn,
        tags: [],
        use: shape,
      }
      await putImage(image)
      images = [image, ...images]
      selected = image.id
      scope = 'use'
      query = ''
      step = 'choose'
    } catch (e) {
      showToast(fill(text.failed, { error: String(e) }), 'error')
    }
  }

  function onpaste(e: ClipboardEvent) {
    const file = pictureIn(e.clipboardData)
    if (!open || step !== 'choose' || !file) return
    e.preventDefault()
    void upload(file)
  }
</script>

<svelte:window {onpaste} />

<dialog
  class="modal picker"
  bind:this={dialog}
  aria-label={title}
  oncancel={(e) => {
    e.preventDefault()
    if (step === 'frame') step = 'choose'
    else close()
  }}
  onclose={() => {
    open = false
    releaseImage(source)
    source = undefined
  }}
  ondragover={(e) => {
    if (step !== 'choose') return
    e.preventDefault()
    dragOver = true
  }}
  ondragleave={() => (dragOver = false)}
  ondrop={(e) => {
    dragOver = false
    if (step !== 'choose') return
    e.preventDefault()
    void upload(pictureIn(e.dataTransfer))
  }}
  class:over={dragOver}
>
  {#if open}
    {#if step === 'choose'}
      <h2>{title}</h2>
      <div class="bar">
        <input type="search" placeholder={text.search} bind:value={query} />
        <span class="scope" role="group">
          <button class:on={scope === 'use'} onclick={() => (scope = 'use')}
            >{text.forUse[shape]}</button
          ><button class:on={scope === 'all'} onclick={() => (scope = 'all')}>{text.all}</button>
        </span>
        <button class="button" onclick={() => fileInput?.click()}>{text.upload}</button>
        <input
          bind:this={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          hidden
          onchange={(e) => {
            void upload(e.currentTarget.files?.[0])
            e.currentTarget.value = ''
          }}
        />
      </div>
      <div class="body">
        <div class="grid" role="listbox" aria-label={title}>
          {#each shown as image (image.id)}
            <button
              class="tile"
              class:chosen={image.id === selected}
              role="option"
              aria-selected={image.id === selected}
              onclick={() => (selected = image.id)}
              ondblclick={() => pick(image.id)}
            >
              <span class="thumb" style:aspect-ratio={IMAGE_SHAPES[shape]}
                ><img src={image.data} alt="" draggable="false" /></span
              >
              <span class="tile-name">{image.name}</span>
            </button>
          {:else}
            <p class="hint nothing">{images.length ? text.none : text.empty}</p>
          {/each}
        </div>
        <aside class="chosen-side">
          {#if chosen}
            <div class="large" style:aspect-ratio={chosen.width / chosen.height}>
              <img src={chosen.data} alt="" draggable="false" />
            </div>
            <p class="hint">{fill(text.size, { width: chosen.width, height: chosen.height })}</p>
            <label class="field">
              <span>{text.name}</span>
              <input
                type="text"
                value={chosen.name}
                onchange={(e) => {
                  const name = e.currentTarget.value.trim()
                  if (name) void save(chosen, { name })
                }}
              />
            </label>
            <div class="field">
              <span>{text.tags}</span>
              <TagInput
                value={chosen.tags}
                choices={allTags}
                placeholder={text.tagsHint}
                label={text.tags}
                removeLabel={text.remove}
                onchange={(tags) => void save(chosen, { tags: tags.map((t) => t.toLowerCase()) })}
              />
            </div>
          {:else}
            <p class="hint">{text.drop}</p>
          {/if}
        </aside>
      </div>
      <div class="dialog-buttons">
        {#if chosen}
          <button class="danger left" onclick={() => void remove(chosen)}>{text.delete}</button>
        {/if}
        {#if current}
          <button onclick={() => pick(undefined)}>{text.clear[shape]}</button>
        {/if}
        <button onclick={close}>{text.cancel}</button>
        <button class="primary" disabled={!chosen} onclick={() => pick(selected)}>{text.use}</button
        >
      </div>
    {:else}
      <h2>{text.frameTitle}</h2>
      <p class="hint">{text.frameHint}</p>
      <div class="framing">
        <div
          class="frame"
          style:width="{frameWidth}px"
          style:height="{frameHeight}px"
          role="presentation"
          {onpointerdown}
          {onpointermove}
          onpointerup={() => (dragging = undefined)}
          {onwheel}
        >
          {#if source}
            <img
              src={source.src}
              alt=""
              draggable="false"
              style:width="{sourceSize.width}px"
              style:height="{sourceSize.height}px"
              style:transform={placed(frameWidth)}
            />
          {/if}
        </div>
        <div class="controls">
          <label class="field">
            <span>{text.zoom}</span>
            <input
              type="range"
              min="1"
              max={MAX_ZOOM}
              step="0.01"
              value={framing.zoom}
              oninput={(e) => setFraming({ zoom: Number(e.currentTarget.value) })}
            />
          </label>
          <div class="turns">
            <button
              class="icon"
              aria-label={text.left}
              use:tooltip={text.left}
              onclick={() => setFraming({ turns: framing.turns + 3 })}>⟲</button
            >
            <button
              class="icon"
              aria-label={text.right}
              use:tooltip={text.right}
              onclick={() => setFraming({ turns: framing.turns + 1 })}>⟳</button
            >
            <button
              class="icon"
              class:on={framing.flip}
              aria-label={text.flip}
              aria-pressed={framing.flip}
              use:tooltip={text.flip}
              onclick={() => setFraming({ flip: !framing.flip })}>⇋</button
            >
          </div>
          <div class="field">
            <span>{text.preview}</span>
            <div
              class="frame small"
              style:width="{previewWidth}px"
              style:height="{Math.round(previewWidth / aspect)}px"
            >
              {#if source}
                <img
                  src={source.src}
                  alt=""
                  draggable="false"
                  style:width="{sourceSize.width}px"
                  style:height="{sourceSize.height}px"
                  style:transform={placed(previewWidth)}
                />
              {/if}
            </div>
          </div>
          <label class="field">
            <span>{text.name}</span>
            <input type="text" bind:value={newName} />
          </label>
        </div>
      </div>
      <div class="dialog-buttons">
        <button onclick={() => (step = 'choose')}>{text.back}</button>
        <button class="primary" onclick={() => void add()}>{text.add}</button>
      </div>
    {/if}
  {/if}
</dialog>

<style>
  .picker {
    width: min(860px, calc(100vw - 32px));
  }

  .picker.over {
    outline: 2px dashed var(--accent);
    outline-offset: -8px;
  }

  h2 {
    margin: 0 0 12px;
    color: var(--accent);
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
  }

  .bar input[type='search'] {
    flex: 1;
    min-width: 160px;
  }

  .scope {
    display: inline-flex;
  }

  .scope button {
    padding: 5px 10px;
    font-size: 13px;
    color: var(--text-muted);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    cursor: pointer;
  }

  .scope button:first-child {
    border-radius: 6px 0 0 6px;
  }

  .scope button:last-child {
    border-left: none;
    border-radius: 0 6px 6px 0;
  }

  .scope button.on {
    color: var(--accent);
    border-color: var(--accent);
  }

  .body {
    display: grid;
    grid-template-columns: 1fr 240px;
    gap: 16px;
    min-height: 300px;
    margin-bottom: 16px;
  }

  @media (max-width: 640px) {
    .body {
      grid-template-columns: 1fr;
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 10px;
    align-content: start;
    max-height: 52vh;
    overflow: auto;
  }

  .tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
    color: var(--text);
    text-align: left;
    background: none;
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: pointer;
  }

  .tile:hover {
    border-color: var(--panel-border);
  }

  .tile.chosen {
    border-color: var(--accent);
  }

  .thumb {
    display: block;
    overflow: hidden;
    background: var(--bg);
    border-radius: 4px;
  }

  .thumb img,
  .large img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .tile-name {
    overflow: hidden;
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .nothing {
    grid-column: 1 / -1;
  }

  .chosen-side {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .large {
    width: 100%;
    max-height: 240px;
    overflow: hidden;
    background: var(--bg);
    border-radius: 6px;
  }

  .field {
    font-size: 12px;
  }

  .dialog-buttons .left {
    margin-right: auto;
  }

  .framing {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-start;
    margin: 12px 0 16px;
  }

  .frame {
    position: relative;
    overflow: hidden;
    background: var(--canvas-bg);
    border: 1px solid var(--accent);
    border-radius: 4px;
    cursor: grab;
    touch-action: none;
  }

  .frame:active {
    cursor: grabbing;
  }

  .frame img {
    position: absolute;
    top: 50%;
    left: 50%;
    max-width: none;
    transform-origin: 0 0;
    pointer-events: none;
  }

  .frame.small {
    cursor: default;
    border-color: var(--panel-border);
  }

  .controls {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 14px;
    min-width: 200px;
  }

  .controls input[type='range'] {
    accent-color: var(--accent);
  }

  .turns {
    display: flex;
    gap: 6px;
  }

  .turns button {
    height: 30px;
    font-size: 16px;
  }

  .turns button.on {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
