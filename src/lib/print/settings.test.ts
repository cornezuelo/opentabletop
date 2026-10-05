import { describe, expect, it } from 'vitest'
import { createMap } from '../model/defaults'
import { resolveSettingsPatch } from './settings'

describe('resolveSettingsPatch', () => {
  it('derives grid size when choosing a paper', () => {
    const map = createMap()
    expect(resolveSettingsPatch(map, { print: { paper: 'A4' } })).toEqual({
      grid: { width: 8, height: 10 },
      print: { paper: 'A4' },
    })
  })

  it('refits on orientation and hex size changes in paper mode', () => {
    const map = createMap()
    map.print.paper = 'A4'
    map.grid = { ...map.grid, width: 8, height: 10 }
    const patch = resolveSettingsPatch(map, { print: { hexMm: 30 } })
    expect(patch?.grid).toBeDefined()
    expect(patch!.grid!.width!).toBeLessThan(8)
    expect(resolveSettingsPatch(map, { grid: { orientation: 'pointy' } })?.grid).toHaveProperty(
      'orientation',
      'pointy',
    )
  })

  it('switches to hex-count mode on manual size edits', () => {
    const map = createMap()
    map.print.paper = 'A4'
    expect(resolveSettingsPatch(map, { grid: { width: 40 } })).toEqual({
      grid: { width: 40 },
      print: { paper: null },
    })
  })

  it('returns null when nothing changes', () => {
    const map = createMap()
    expect(resolveSettingsPatch(map, { grid: { width: 30 } })).toBeNull()
    expect(resolveSettingsPatch(map, { print: { hexMm: 25 } })).toBeNull()
  })
})
