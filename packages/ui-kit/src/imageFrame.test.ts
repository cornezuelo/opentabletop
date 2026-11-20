import { describe, expect, it } from 'vitest'
import { clampFraming, coverScale, FRAMED, framedDraw, imageName, MAX_ZOOM } from './imageFrame'

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

  it('is kept at most 512 on its longer side, in its frame’s shape', () => {
    const big = { width: 4000, height: 3000 }
    expect(framedDraw(big, 1, FRAMED)).toMatchObject({ width: 512, height: 512 })
    expect(framedDraw(big, 3, FRAMED)).toMatchObject({ width: 512, height: 171 })
    const square = framedDraw(big, 1, FRAMED)
    // The picture's 3000 px of height drawn into 512.
    expect(square.scale).toBeCloseTo(512 / 3000)
    expect(square.centerX).toBe(256)
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
