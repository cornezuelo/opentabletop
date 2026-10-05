import { describe, expect, it } from 'vitest'
import { createMap, DEFAULT_LABEL_STYLE } from '../model/defaults'
import { deserializeMap, serializeMap } from '../model/serialize'
import type { MapLabel } from '../model/types'
import { History } from './history'
import { ReplaceLabelCommand } from './paths'

const label: MapLabel = {
  id: 'label0000001',
  text: 'Mar de Piedra',
  x: 3.5,
  y: -1,
  style: { ...DEFAULT_LABEL_STYLE, rotation: -15, italic: true },
}

describe('labels', () => {
  it('adds, edits and removes with undo', () => {
    const map = createMap()
    const history = new History()
    history.execute(new ReplaceLabelCommand(null, label), map)
    history.execute(new ReplaceLabelCommand(label, { ...label, text: 'Kyrg' }), map)
    expect(map.labels[0].text).toBe('Kyrg')
    history.undo(map)
    expect(map.labels[0].text).toBe('Mar de Piedra')
    history.undo(map)
    expect(map.labels).toEqual([])
  })

  it('round-trips and sanitizes styles', () => {
    const map = createMap()
    map.labels = [label]
    expect(deserializeMap(serializeMap(map)).labels).toEqual([label])

    const raw = JSON.parse(serializeMap(map))
    raw.labels[0].style = { font: 'comic', size: 99, color: 'red' }
    raw.labels.push({ text: 'no position' })
    const loaded = deserializeMap(JSON.stringify(raw)).labels
    expect(loaded).toHaveLength(1)
    expect(loaded[0].style).toMatchObject({
      font: 'fell',
      size: 4,
      color: DEFAULT_LABEL_STYLE.color,
    })
  })
})
