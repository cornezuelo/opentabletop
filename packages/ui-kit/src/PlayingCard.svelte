<script lang="ts">
  import { packImageUrl } from './packImages'

  /**
   * A card drawn from a deck (docs/oracle-engine.md, _Cards with faces_): its pack's picture, or
   * a face drawn from its parts (the index in two corners, a sign or an icon in the middle, a
   * domino's pips), red, black or its own ink; upside down when it came out `turned`. A face
   * with none of them (a card of words alone) is drawn with its words (`label`) on it. `width`
   * in px, its height a card's.
   */
  let {
    face,
    width = 120,
    label = '',
  }: {
    face: {
      image?: string
      corner?: string
      symbol?: string
      icon?: string
      pips?: [number, number]
      ink?: string
      turned?: boolean
    }
    width?: number
    /** What the card is, for whoever can't see it (its text). */
    label?: string
  } = $props()

  const url = $derived(packImageUrl(face.image))
  let broken = $state(false)
  const ink = $derived(
    face.ink === 'red'
      ? 'var(--card-red)'
      : face.ink && face.ink !== 'black'
        ? face.ink
        : 'var(--card-ink)',
  )
  let iconSvg = $state<string>()
  $effect(() => {
    const id = face.icon
    if (!id) return void (iconSvg = undefined)
    void import('./icons').then(({ getBuiltinIcon, builtinSvg }) => {
      const icon = getBuiltinIcon(id)
      iconSvg = icon ? builtinSvg(icon, 'currentColor') : undefined
    })
  })

  /** Where a half's pips stand, on a 3 × 3 grid (0–9), as a domino draws them. */
  const PIPS: Record<number, [number, number][]> = {
    0: [],
    1: [[1, 1]],
    2: [
      [0, 0],
      [2, 2],
    ],
    3: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    4: [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ],
    5: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
    ],
    6: [
      [0, 0],
      [0, 1],
      [0, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    7: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    8: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    9: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
  }
</script>

<span
  class="card"
  class:turned={face.turned}
  class:picture={url && !broken}
  class:small={width < 60}
  style:width="{width}px"
  style:height="{Math.round(width * 1.6)}px"
  style:--ink={ink}
  style:--size="{width}px"
  role="img"
  aria-label={label}
>
  {#if url && !broken}
    <img src={url} alt="" draggable="false" onerror={() => (broken = true)} />
  {:else if !face.pips && !face.corner && !face.symbol && !face.icon}
    <!-- Words alone: what the card says, on the card. -->
    <span class="words">{label}</span>
  {:else if face.pips}
    {#each face.pips as half, h (h)}
      <span class="half">
        {#each PIPS[half] ?? [] as [col, row], i (i)}
          <span class="pip" style:grid-column={col + 1} style:grid-row={row + 1}></span>
        {/each}
      </span>
    {/each}
  {:else}
    {#if face.corner}
      <span class="corner top"
        >{face.corner}{#if face.symbol}<br />{face.symbol}{/if}</span
      >
      <span class="corner bottom"
        >{face.corner}{#if face.symbol}<br />{face.symbol}{/if}</span
      >
    {/if}
    <span class="middle">
      {#if iconSvg}
        <!-- A bundled icon (game-icons.net): trusted markup. -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <span class="icon">{@html iconSvg}</span>
      {:else if face.symbol}
        {face.symbol}
      {:else if face.corner}
        {face.corner}
      {/if}
    </span>
  {/if}
</span>

<style>
  .card {
    position: relative;
    display: inline-flex;
    flex: none;
    flex-direction: column;
    overflow: hidden;
    color: var(--ink);
    background: var(--card-paper);
    border: 1px solid var(--card-edge);
    border-radius: calc(var(--size) * 0.07);
    box-shadow: 0 2px 6px rgb(0 0 0 / 35%);
    transition: transform 0.3s ease;
  }

  .card.turned {
    transform: rotate(180deg);
  }

  .card.picture {
    background: #000;
  }

  .card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .corner {
    position: absolute;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: calc(var(--size) * 0.14);
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }

  .corner.top {
    top: 6%;
    left: 7%;
  }

  .corner.bottom {
    right: 7%;
    bottom: 6%;
    transform: rotate(180deg);
  }

  .small .corner {
    display: none;
  }

  .middle {
    display: grid;
    flex: 1;
    place-items: center;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: calc(var(--size) * 0.45);
    line-height: 1;
  }

  .words {
    display: -webkit-box;
    margin: auto 0;
    padding: 0 9%;
    overflow: hidden;
    -webkit-line-clamp: 8;
    line-clamp: 8;
    -webkit-box-orient: vertical;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: max(9px, calc(var(--size) * 0.11));
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .small .words {
    -webkit-line-clamp: 4;
    line-clamp: 4;
  }

  .icon {
    display: block;
    width: 62%;
  }

  .icon :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  .half {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    place-items: center;
    padding: 12%;
  }

  .half + .half {
    border-top: 1px solid var(--card-edge);
  }

  .pip {
    width: calc(var(--size) * 0.15);
    height: calc(var(--size) * 0.15);
    background: var(--ink);
    border-radius: 50%;
  }
</style>
