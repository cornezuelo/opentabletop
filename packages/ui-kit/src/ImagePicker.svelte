<script lang="ts">
  import {
    allImages,
    deleteImage,
    IMAGE_FORMAT,
    putImage,
    readImage,
    type LibraryImage,
  } from '@open-tabletop/storage'
  import { imageUses, keptHere, type ImageUse } from '@open-tabletop/transfer'
  import { readDefinitionPictures } from './definitionPictures.svelte'
  import { confirmAction } from './dialog.svelte'
  import { drawFramed, ImageFileError, pictureIn, readImageFile, releaseImage } from './imageFile'
  import {
    clampFraming,
    coverScale,
    FRAMED,
    clampFace,
    faceBox,
    faceOf,
    IMAGE_SHAPES,
    ownAspect,
    type ImageFace,
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
   * chosen, or undefined for none. Without `onpick` it's the library's own screen (every app's
   * **Your images…**): nothing is chosen or added, only seen, renamed, tagged and deleted, with
   * what uses each (**Used by**) and those nothing uses found apart.
   */
  let {
    open = $bindable(false),
    locale,
    title,
    shape,
    current,
    onpick,
    start = 'choose',
  }: {
    open?: boolean
    locale: string
    /** What it's for (_Kael's portrait_). */
    title: string
    /** The slot's shape; none on the library's own screen. */
    shape?: ImageShape
    /** The picture there now, chosen when it opens. */
    current?: string
    onpick?: (id: string | undefined) => void
    /** Opened on the face of `current` (**Frame the face**), not on the choosing. */
    start?: 'choose' | 'face'
  } = $props()

  const TEXT = {
    en: {
      search: 'Search by name or tag',
      forUse: {
        portrait: 'Portraits',
        banner: 'Banners',
        item: 'Items',
        place: 'Places',
        map: 'Maps',
      },
      all: 'All',
      unused: 'Not used',
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
      deleteUsed:
        'Delete “{name}” from the library? It’s used by {uses}: they will show nothing in its place{maps}. This can’t be undone.',
      deleteUnused: 'Delete “{name}” from the library? Nothing uses it. This can’t be undone.',
      deleteConfirm: 'Delete',
      mapsKeep: ' (a map keeps its own copy)',
      usedBy: 'Used by',
      usedByNone: 'Nothing uses it.',
      kinds: {
        map: 'map',
        campaign: 'campaign',
        trip: 'trip',
        character: 'character',
        pack: 'pack',
      },
      definitions: { items: 'item of {part}', templates: 'template of {part}' },
      definition: '{kind} of {part}',
      close: 'Close',
      clear: {
        portrait: 'Remove the portrait',
        banner: 'Remove the banner',
        item: 'Remove the picture',
        place: 'Remove the picture',
        map: 'Remove the picture',
      },
      cancel: 'Cancel',
      use: 'Use this one',
      frameTitle: 'The picture',
      frameHint:
        'It’s kept whole: turn or flip it if it needs it; zoom in (the wheel or the slider) and drag it only to cut it.',
      face: 'Frame the face',
      faceTitle: 'The face of {name}',
      faceHint:
        'The square shown where the picture is small (a fight, a token, a list): drag it onto the face, the wheel or the slider makes it bigger or smaller.',
      faceSize: 'Size',
      faceSave: 'Keep the face',
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
      forUse: {
        portrait: 'Retratos',
        banner: 'Estandartes',
        item: 'Objetos',
        place: 'Lugares',
        map: 'Mapas',
      },
      all: 'Todas',
      unused: 'Sin usar',
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
      deleteUsed:
        '¿Borrar «{name}» de la biblioteca? La usan {uses}: se quedarán sin imagen{maps}. No se puede deshacer.',
      deleteUnused: '¿Borrar «{name}» de la biblioteca? Nada la usa. No se puede deshacer.',
      deleteConfirm: 'Borrar',
      mapsKeep: ' (un mapa conserva su propia copia)',
      usedBy: 'Usada por',
      usedByNone: 'Nada la usa.',
      kinds: {
        map: 'mapa',
        campaign: 'campaña',
        trip: 'viaje',
        character: 'personaje',
        pack: 'pack',
      },
      definitions: { items: 'objeto de {part}', templates: 'plantilla de {part}' },
      definition: '{kind} de {part}',
      close: 'Cerrar',
      clear: {
        portrait: 'Quitar el retrato',
        banner: 'Quitar el estandarte',
        item: 'Quitar la imagen',
        place: 'Quitar la imagen',
        map: 'Quitar la imagen',
      },
      cancel: 'Cancelar',
      use: 'Usar esta',
      frameTitle: 'La imagen',
      frameHint:
        'Se guarda entera: gírala o voltéala si hace falta; acércala (la rueda o la barra) y arrástrala solo para recortarla.',
      face: 'Encuadrar la cara',
      faceTitle: 'La cara de {name}',
      faceHint:
        'El cuadro que se ve donde la imagen sale en pequeño (un combate, un token, una lista): arrástralo hasta la cara; la rueda o la barra lo agrandan o lo encogen.',
      faceSize: 'Tamaño',
      faceSave: 'Guardar la cara',
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
  /** The library's own screen: nothing to choose. */
  const managing = $derived(!onpick)
  /** The tiles' shape: the slot's, a landscape for pictures kept as they are. */
  const tileAspect = $derived(shape ? IMAGE_SHAPES[shape] || 1.5 : 1)

  let dialog = $state<HTMLDialogElement>()
  let fileInput = $state<HTMLInputElement>()
  let step = $state<'choose' | 'frame' | 'face'>('choose')
  let images = $state<LibraryImage[]>([])
  let query = $state('')
  let scope = $state<'use' | 'all' | 'unused'>('use')
  /** What uses each image, by id; undefined until read. */
  let uses = $state<Record<string, ImageUse[]>>()
  let selected = $state<string>()
  let dragOver = $state(false)

  async function load() {
    images = (await allImages()).flatMap((e) => readImage(e) ?? [])
  }

  /** What uses each image, read from everything kept here (as an export reads it). */
  async function loadUses() {
    uses = undefined
    try {
      const { kept } = await keptHere()
      uses = imageUses(kept, readDefinitionPictures())
    } catch {
      // Without it, Used by and Not used say nothing.
    }
  }

  /** A use as a line: what uses it, then what that is (_Rope — character Brenna_). */
  function useLine(use: ImageUse): [string, string] {
    if (use.kind === 'definition') {
      const part = use.part ?? ''
      const known = text.definitions[use.definition as keyof typeof text.definitions]
      return [
        use.name,
        known ? fill(known, { part }) : fill(text.definition, { kind: use.definition ?? '', part }),
      ]
    }
    const kind = text.kinds[use.kind]
    return use.part ? [use.part, `${kind} ${use.name}`.trim()] : [use.name || kind, kind]
  }

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) {
      step = 'choose'
      query = ''
      selected = current
      void loadUses()
      void load().then(() => {
        // Pictures for this use first; all of them when there are none.
        scope = !managing && images.some((i) => i.use === shape) ? 'use' : 'all'
        const now = start === 'face' && images.find((i) => i.id === current)
        if (now) startFace(now)
      })
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  })

  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return images
      .filter((i) =>
        scope === 'use' ? i.use === shape : scope === 'unused' ? !!uses && !uses[i.id] : true,
      )
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q)))
      .sort((a, b) => Number(b.use === shape) - Number(a.use === shape))
  })
  const chosen = $derived(images.find((i) => i.id === selected))
  const chosenUses = $derived(chosen && uses ? (uses[chosen.id] ?? []) : undefined)
  const allTags = $derived([...new Set(images.flatMap((i) => i.tags))].sort())

  function close() {
    open = false
  }
  function pick(id: string | undefined) {
    onpick?.(id)
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
    const used = uses?.[image.id]
    const message = !uses ? text.deleteMessage : used?.length ? text.deleteUsed : text.deleteUnused
    const usedBy = (used ?? []).map((u) => useLine(u).join(', ')).join('; ')
    const maps = used?.some((u) => u.kind === 'map') ? text.mapsKeep : ''
    const sure = await confirmAction(fill(message, { name: image.name, uses: usedBy, maps }), {
      confirm: text.deleteConfirm,
    })
    if (!sure) return
    await deleteImage(image.id)
    images = images.filter((i) => i.id !== image.id)
    if (selected === image.id) selected = undefined
    // What showed it shows nothing now.
    if (current === image.id) onpick?.(undefined)
  }

  // Framing an upload.
  let source = $state<HTMLImageElement>()
  let framing = $state<Framing>(FRAMED)
  let newName = $state('')
  const sourceSize = $derived(
    source ? { width: source.naturalWidth, height: source.naturalHeight } : { width: 1, height: 1 },
  )
  /** The frame's shape: the picture's own as it's turned (it's kept whole, §10). */
  const aspect = $derived(ownAspect(sourceSize, framing.turns))
  /** The frame's size on screen. */
  const frameWidth = $derived(Math.round(Math.min(480, 360 * aspect)))
  const frameHeight = $derived(Math.round(frameWidth / aspect))
  const previewWidth = $derived(Math.round(Math.min(192, 120 * aspect)))

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
        name: newName.trim() || (shape ? text.forUse[shape] : ''),
        modified: new Date().toISOString(),
        format: IMAGE_FORMAT,
        ...drawn,
        tags: [],
        ...(shape && { use: shape }),
      }
      await putImage(image)
      images = [image, ...images]
      selected = image.id
      scope = 'use'
      query = ''
      // A face shown small (a portrait, an item): framed next.
      if (shape && IMAGE_SHAPES[shape] === 1) startFace(image)
      else step = 'choose'
    } catch (e) {
      showToast(fill(text.failed, { error: String(e) }), 'error')
    }
  }

  // Framing a picture's face (§10): the picture still, the square moved over it.
  let face = $state<ImageFace>({ x: 0.5, y: 0.5, size: 1 })
  let faceImage = $state<LibraryImage>()
  /** The face's box on screen: the picture fitted in it. */
  const FACE_BOX = { width: 480, height: 360 }
  const faceFit = $derived.by(() => {
    if (!faceImage) return { width: 1, height: 1 }
    const scale = Math.min(FACE_BOX.width / faceImage.width, FACE_BOX.height / faceImage.height)
    return {
      width: Math.round(faceImage.width * scale),
      height: Math.round(faceImage.height * scale),
    }
  })
  /** The face's square on screen, in px of the fitted picture. */
  const faceSquare = $derived.by(() => {
    const side = face.size * Math.min(faceFit.width, faceFit.height)
    return {
      side,
      left: face.x * faceFit.width - side / 2,
      top: face.y * faceFit.height - side / 2,
    }
  })
  const facePreview = $derived(faceImage ? faceBox(faceImage, face) : undefined)

  function startFace(image: LibraryImage) {
    faceImage = image
    face = faceOf(image)
    step = 'face'
  }
  const setFace = (next: Partial<ImageFace>) => {
    if (faceImage) face = clampFace(faceImage, { ...face, ...next })
  }
  let faceDrag: { x: number; y: number } | undefined
  function onfacedown(e: PointerEvent) {
    faceDrag = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onfacemove(e: PointerEvent) {
    if (!faceDrag) return
    setFace({
      x: face.x + (e.clientX - faceDrag.x) / faceFit.width,
      y: face.y + (e.clientY - faceDrag.y) / faceFit.height,
    })
    faceDrag = { x: e.clientX, y: e.clientY }
  }
  function onfacewheel(e: WheelEvent) {
    e.preventDefault()
    setFace({ size: face.size * Math.exp(e.deltaY * 0.0015) })
  }
  async function keepFace() {
    if (faceImage) {
      const kept = images.find((i) => i.id === faceImage!.id) ?? faceImage
      await save(kept, { face: { ...face } })
    }
    step = 'choose'
  }

  function onpaste(e: ClipboardEvent) {
    const file = pictureIn(e.clipboardData)
    if (!open || managing || step !== 'choose' || !file) return
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
    if (step !== 'choose') step = 'choose'
    else close()
  }}
  onclose={() => {
    open = false
    releaseImage(source)
    source = undefined
  }}
  ondragover={(e) => {
    if (step !== 'choose' || managing) return
    e.preventDefault()
    dragOver = true
  }}
  ondragleave={() => (dragOver = false)}
  ondrop={(e) => {
    dragOver = false
    if (step !== 'choose' || managing) return
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
          {#if shape}<button class:on={scope === 'use'} onclick={() => (scope = 'use')}
              >{text.forUse[shape]}</button
            >{/if}<button class:on={scope === 'all'} onclick={() => (scope = 'all')}
            >{text.all}</button
          >{#if managing}<button
              class:on={scope === 'unused'}
              disabled={!uses}
              onclick={() => (scope = 'unused')}>{text.unused}</button
            >{/if}
        </span>
        {#if !managing}
          <button class="button" onclick={() => fileInput?.click()}>{text.upload}</button>
        {/if}
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
              ondblclick={() => !managing && pick(image.id)}
            >
              <span class="thumb" style:aspect-ratio={tileAspect}
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
            <p class="hint">
              {fill(text.size, { width: chosen.width, height: chosen.height })}
              · <button class="link" onclick={() => startFace(chosen)}>{text.face}</button>
            </p>
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
            {#if chosenUses}
              <div class="uses">
                <span class="overline">{text.usedBy}</span>
                {#each chosenUses as use, i (i)}
                  {@const [what, where] = useLine(use)}
                  <span class="use">{what} <span class="hint">· {where}</span></span>
                {:else}
                  <span class="hint">{text.usedByNone}</span>
                {/each}
              </div>
            {/if}
          {:else if !managing}
            <p class="hint">{text.drop}</p>
          {/if}
        </aside>
      </div>
      <div class="dialog-buttons">
        {#if chosen}
          <button class="danger left" onclick={() => void remove(chosen)}>{text.delete}</button>
        {/if}
        {#if managing || !shape}
          <button class="primary" onclick={close}>{text.close}</button>
        {:else}
          {#if current}
            <button onclick={() => pick(undefined)}>{text.clear[shape]}</button>
          {/if}
          <button onclick={close}>{text.cancel}</button>
          <button class="primary" disabled={!chosen} onclick={() => pick(selected)}
            >{text.use}</button
          >
        {/if}
      </div>
    {:else if step === 'face' && faceImage}
      <h2>{fill(text.faceTitle, { name: faceImage.name })}</h2>
      <p class="hint">{text.faceHint}</p>
      <div class="framing">
        <div
          class="whole"
          style:width="{faceFit.width}px"
          style:height="{faceFit.height}px"
          role="presentation"
          onwheel={onfacewheel}
        >
          <img src={faceImage.data} alt="" draggable="false" />
          <div
            class="face-square"
            style:width="{faceSquare.side}px"
            style:height="{faceSquare.side}px"
            style:left="{faceSquare.left}px"
            style:top="{faceSquare.top}px"
            role="presentation"
            onpointerdown={onfacedown}
            onpointermove={onfacemove}
            onpointerup={() => (faceDrag = undefined)}
          ></div>
        </div>
        <div class="controls">
          <label class="field">
            <span>{text.faceSize}</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={face.size}
              oninput={(e) => setFace({ size: Number(e.currentTarget.value) })}
            />
          </label>
          <div class="field">
            <span>{text.preview}</span>
            <div class="previews">
              {#each [96, 32] as side (side)}
                <span class="face-preview" style:width="{side}px" style:height="{side}px">
                  {#if facePreview}
                    <img
                      src={faceImage.data}
                      alt=""
                      draggable="false"
                      style:width="{facePreview.width}%"
                      style:left="{facePreview.left}%"
                      style:top="{facePreview.top}%"
                    />
                  {/if}
                </span>
              {/each}
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-buttons">
        <button onclick={() => (step = 'choose')}>{text.back}</button>
        <button class="primary" onclick={() => void keepFace()}>{text.faceSave}</button>
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

  .scope button:only-child {
    border-radius: 6px;
  }

  .scope button + button {
    border-left: none;
  }

  .scope button:last-child:not(:only-child) {
    border-radius: 0 6px 6px 0;
  }

  .scope button:disabled {
    cursor: default;
    opacity: 0.5;
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

  .uses {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
  }

  .use {
    overflow-wrap: anywhere;
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
    max-width: 320px;
  }

  .controls input[type='range'] {
    accent-color: var(--accent);
  }

  .whole {
    position: relative;
    flex: none;
    overflow: hidden;
    background: var(--canvas-bg);
    border-radius: 4px;
  }

  .whole > img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .face-square {
    position: absolute;
    border: 2px solid var(--accent);
    border-radius: 2px;
    /* What's outside the face, darkened. */
    box-shadow: 0 0 0 9999px rgb(0 0 0 / 55%);
    cursor: grab;
    touch-action: none;
  }

  .face-square:active {
    cursor: grabbing;
  }

  .previews {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  .face-preview {
    position: relative;
    display: block;
    overflow: hidden;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
  }

  .face-preview img {
    position: absolute;
    max-width: none;
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
