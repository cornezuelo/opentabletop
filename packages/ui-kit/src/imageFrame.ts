/**
 * Framing a picture before it's kept (docs/character-pictures.md §9): the picture behind a
 * frame of its slot's shape, moved, zoomed, turned and flipped, then drawn at that frame's
 * shape into the image library. Plain numbers here (tested); the canvas is `imageFile`'s.
 */

/** The shapes a picture is kept in, by what it's for: its frame's width over its height. */
export const IMAGE_SHAPES = { portrait: 1, banner: 3, item: 1 } as const
export type ImageShape = keyof typeof IMAGE_SHAPES

/** The longer side of a kept picture, at most (decided 2026-10-23). */
export const IMAGE_MAX_SIDE = 512

/** How a picture sits in its frame. */
export interface Framing {
  /** 1 fills the frame (the picture's shorter side, after turning, touches its edges); more is closer. */
  zoom: number
  /** Where the picture's centre is from the frame's, as a fraction of the frame's width and height. */
  x: number
  y: number
  /** Quarter turns clockwise (0–3). */
  turns: number
  /** Mirrored left to right. */
  flip: boolean
}

export const FRAMED: Framing = { zoom: 1, x: 0, y: 0, turns: 0, flip: false }

/** How far one may zoom in. */
export const MAX_ZOOM = 6

/** The picture's size once turned. */
export function turnedSize(width: number, height: number, turns: number) {
  return turns % 2 ? { width: height, height: width } : { width, height }
}

/**
 * How much the picture is scaled to fill a frame `frameWidth` × `frameHeight` at a zoom: the
 * frame covered, never a gap.
 */
export function coverScale(
  image: { width: number; height: number },
  frame: { width: number; height: number },
  framing: Pick<Framing, 'zoom' | 'turns'>,
): number {
  const turned = turnedSize(image.width, image.height, framing.turns)
  return Math.max(frame.width / turned.width, frame.height / turned.height) * framing.zoom
}

/**
 * The framing kept within bounds: a zoom from 1 to `MAX_ZOOM`, a whole number of turns, and the
 * picture moved no further than keeps the frame covered.
 */
export function clampFraming(
  image: { width: number; height: number },
  aspect: number,
  framing: Framing,
): Framing {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, framing.zoom || 1))
  const turns = (((Math.round(framing.turns) % 4) + 4) % 4) as Framing['turns']
  const frame = { width: aspect, height: 1 }
  const scale = coverScale(image, frame, { zoom, turns })
  const turned = turnedSize(image.width, image.height, turns)
  // How far the centre may go, as a fraction of the frame, each way.
  const roomX = Math.max(0, (turned.width * scale - frame.width) / 2 / frame.width)
  const roomY = Math.max(0, (turned.height * scale - frame.height) / 2 / frame.height)
  const within = (v: number, room: number) => Math.min(room, Math.max(-room, v || 0))
  return {
    zoom,
    x: within(framing.x, roomX),
    y: within(framing.y, roomY),
    turns,
    flip: framing.flip,
  }
}

/** Where to draw a framed picture: the kept size and the transform from the picture's centre. */
export interface FramedDraw {
  width: number
  height: number
  /** The picture's centre in the result. */
  centerX: number
  centerY: number
  /** Result pixels per picture pixel. */
  scale: number
  /** Clockwise, in radians. */
  rotation: number
  flip: boolean
}

/**
 * How a picture is drawn into its frame's shape: no larger than `maxSide` on the longer side,
 * nor larger than the picture's own pixels make it (a small picture isn't blown up).
 */
export function framedDraw(
  image: { width: number; height: number },
  aspect: number,
  framing: Framing,
  maxSide = IMAGE_MAX_SIDE,
): FramedDraw {
  const f = clampFraming(image, aspect, framing)
  // In frame units (height 1): picture pixels to frame, then frame to result.
  const toFrame = coverScale(image, { width: aspect, height: 1 }, f)
  const longer = Math.max(aspect, 1)
  const natural = longer / toFrame
  const side = Math.max(1, Math.round(Math.min(maxSide, natural)))
  const perUnit = side / longer
  const width = Math.max(1, Math.round(aspect * perUnit))
  const height = Math.max(1, Math.round(perUnit))
  return {
    width,
    height,
    centerX: width / 2 + f.x * width,
    centerY: height / 2 + f.y * height,
    scale: toFrame * perUnit,
    rotation: (f.turns * Math.PI) / 2,
    flip: f.flip,
  }
}

/** A file's name made a picture's name: no extension, its dashes and underscores as spaces. */
export function imageName(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}
