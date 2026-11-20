import { describe, expect, it } from 'vitest'
import {
  clampFace,
  clampFraming,
  coverScale,
  faceBox,
  faceOf,
  faceRect,
  FRAMED,
  framedDraw,
  imageName,
  MAX_ZOOM,
  ownAspect,
} from './imageFrame'

const wide = { width: 1000, height: 500 }

describe('framing a picture', () => {
  it('fills its frame at zoom 1: the shorter side touches the edges', () => {
    // A 1000×500 picture in a square frame of height 1: its height fills it.
    expect(coverScale(wide, { width: 1, height: 1 }, FRAMED)).toBeCloseTo(1 / 500)
    // Turned a quarter, it's 500 wide: its width fills it.
    expect(coverScale(wide, { width: 1, height: 1 }, { zoom: 1, turns: 1 })).toBeCloseTo(1 / 500)
    // A banner three times as wide as high: the width decides.
    expect(coverScale(wide, { width: 3, height: 1 }, FRAMED)).toBeCloseTo(3 / 1000)
  })

  it('keeps the frame covered when moved, and the zoom and turns in bounds', () => {
    // In a square, the 2:1 picture may slide half a frame each way, and not up or down.
    expect(clampFraming(wide, 1, { ...FRAMED, x: 3, y: 3 })).toMatchObject({ x: 0.5, y: 0 })
    expect(clampFraming(wide, 1, { ...FRAMED, x: -3 })).toMatchObject({ x: -0.5 })
    // Zoomed twice, it may go further, and up and down too.
    expect(clampFraming(wide, 1, { ...FRAMED, zoom: 2, x: 9, y: 9 })).toMatchObject({
      x: 1.5,
      y: 0.5,
    })
    expect(clampFraming(wide, 1, { ...FRAMED, zoom: 0.2 }).zoom).toBe(1)
    expect(clampFraming(wide, 1, { ...FRAMED, zoom: 99 }).zoom).toBe(MAX_ZOOM)
    expect(clampFraming(wide, 1, { ...FRAMED, turns: -1 }).turns).toBe(3)
    expect(clampFraming(wide, 1, { ...FRAMED, turns: 5 }).turns).toBe(1)
  })

  it('is kept at most 2048 on its longer side, in its frame’s shape', () => {
    const big = { width: 4000, height: 3000 }
    expect(framedDraw(big, 1, FRAMED)).toMatchObject({ width: 2048, height: 2048 })
    expect(framedDraw(big, 3, FRAMED)).toMatchObject({ width: 2048, height: 683 })
    const square = framedDraw(big, 1, FRAMED)
    // The picture's 3000 px of height drawn into 2048.
    expect(square.scale).toBeCloseTo(2048 / 3000)
    expect(square.centerX).toBe(1024)
    // Uploaded whole, in its own proportions: nothing cut.
    expect(framedDraw(big, ownAspect(big), FRAMED)).toMatchObject({ width: 2048, height: 1536 })
    expect(ownAspect(big, 1)).toBeCloseTo(0.75)
  })

  it('isn’t blown up past its own pixels', () => {
    // 300×200 in a square: the crop is 200 px across, so 200 kept.
    expect(framedDraw({ width: 300, height: 200 }, 1, FRAMED)).toMatchObject({
      width: 200,
      height: 200,
      scale: 1,
    })
    // Zoomed twice, the crop is 100 px across.
    expect(framedDraw({ width: 300, height: 200 }, 1, { ...FRAMED, zoom: 2 }).width).toBe(100)
  })

  it('moves, turns and flips as framed', () => {
    const drawn = framedDraw(wide, 1, { zoom: 1, x: 0.25, y: 0, turns: 1, flip: true })
    // Turned a quarter, the picture is 500×1000: it can't slide sideways any more.
    expect(drawn.centerX).toBe(drawn.width / 2)
    expect(drawn.rotation).toBeCloseTo(Math.PI / 2)
    expect(drawn.flip).toBe(true)
    const moved = framedDraw(wide, 1, { ...FRAMED, x: 0.25 })
    expect(moved.centerX).toBe(moved.width * 0.75)
  })

  it('names a picture after its file', () => {
    expect(imageName('old_tobin-portrait.PNG')).toBe('old tobin portrait')
    expect(imageName('Kael.webp')).toBe('Kael')
  })
})

describe('a picture’s face', () => {
  const tall = { width: 400, height: 1000 }

  it('is the whole shorter side, at the top of a tall picture and the middle of a wide one', () => {
    expect(faceOf(tall)).toEqual({ x: 0.5, y: 0.2, size: 1 })
    expect(faceOf(wide)).toEqual({ x: 0.5, y: 0.5, size: 1 })
    expect(faceOf({ ...tall, face: { x: 0.5, y: 0.5, size: 0.5 } })).toEqual({
      x: 0.5,
      y: 0.5,
      size: 0.5,
    })
  })

  it('stays within the picture, no smaller than a tenth', () => {
    expect(clampFace(tall, { x: 0, y: 2, size: 0.5 })).toEqual({ x: 0.25, y: 0.9, size: 0.5 })
    expect(clampFace(tall, { x: 0.5, y: 0.5, size: 0 }).size).toBe(1)
    expect(clampFace(tall, { x: 0.5, y: 0.5, size: 0.01 }).size).toBe(0.1)
  })

  it('is placed in a square box, and drawn from its own pixels', () => {
    // Half the width, centred at the top quarter: the picture is twice the box wide.
    const face = { x: 0.5, y: 0.25, size: 0.5 }
    expect(faceBox(tall, face)).toEqual({ width: 200, left: -50, top: -75 })
    expect(faceRect(tall, face)).toEqual({ x: 100, y: 150, side: 200 })
  })
})
