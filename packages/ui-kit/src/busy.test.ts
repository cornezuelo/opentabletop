import { describe, expect, it } from 'vitest'
import { busy, whileBusy } from './busy'

/** A button as the action sees it: an attribute, its classes, a click listener. */
function button() {
  const attrs = new Map<string, string>()
  const classes = new Set<string>()
  let listener: ((e: Event) => void) | undefined
  return {
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
    addEventListener: (_: string, l: (e: Event) => void) => void (listener = l),
    removeEventListener: () => void (listener = undefined),
    classList: {
      toggle: (c: string, on: boolean) => void (on ? classes.add(c) : classes.delete(c)),
    },
    /** A click: whether it got through. */
    click() {
      let stopped = false
      listener?.({
        preventDefault() {},
        stopImmediatePropagation: () => void (stopped = true),
      } as unknown as Event)
      return !stopped
    },
    attrs,
    classes,
  }
}

describe('busy buttons', () => {
  it('can’t be pressed while busy, say so, and go back to how they were', () => {
    const b = button()
    const action = busy(b as unknown as HTMLButtonElement, true)
    expect(b.attrs.get('aria-busy')).toBe('true')
    expect(b.classes.has('busy')).toBe(true)
    expect(b.click()).toBe(false)
    action.update(false)
    expect(b.attrs.has('aria-busy')).toBe(false)
    expect(b.classes.has('busy')).toBe(false)
    expect(b.click()).toBe(true)
    action.destroy()
  })

  it('run one task at a time, busy until it ends, even when it fails', async () => {
    const state = { busy: false }
    let seen = false
    const done = whileBusy(state, async () => {
      seen = state.busy
      return 3
    })
    expect(await whileBusy(state, () => 4)).toBeUndefined()
    expect(await done).toBe(3)
    expect(seen).toBe(true)
    expect(state.busy).toBe(false)
    await expect(
      whileBusy(state, () => {
        throw new Error('no')
      }),
    ).rejects.toThrow('no')
    expect(state.busy).toBe(false)
  })
})
