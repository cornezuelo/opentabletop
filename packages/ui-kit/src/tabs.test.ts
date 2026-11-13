import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import Tabs from './Tabs.svelte'

describe('Tabs', () => {
  const props = {
    tabs: [
      { id: 'party', label: 'Party' },
      { id: 'journal', label: 'Journal' },
    ],
    value: 'journal',
    label: 'The trip',
    prefix: 'trip',
    onchange: () => {},
  }

  it('renders a row of tabs, the chosen one selected, before it is measured', () => {
    const { body } = render(Tabs, { props })
    expect(body).toContain('role="tablist"')
    expect(body).not.toContain('<select')
    expect(body).toMatch(/id="trip-tab-journal"[^>]*aria-selected="true"/)
    expect(body).toMatch(/id="trip-tab-party"[^>]*aria-selected="false"/)
    expect(body.match(/aria-controls="trip-panel"/g)).toHaveLength(2)
  })

  it('shows a count above 0 beside its tab, and keeps its room measured even at 0', () => {
    const count = (n: number) => ({
      ...props,
      tabs: [{ id: 'journal', label: 'Journal', count: n }, props.tabs[0]],
      value: 'party',
    })
    // Without Svelte's hydration marks.
    const body = (n: number) => render(Tabs, { props: count(n) }).body.replace(/<!--[^>]*-->/g, '')
    const shown = body(3)
    expect(shown).toMatch(/id="trip-tab-journal"[^>]*>Journal<span class="count[^"]*">3<\/span>/)
    const none = body(0)
    expect(none).not.toMatch(/id="trip-tab-journal"[^>]*>Journal<span/)
    // The measure always has the count's room: the tabs fit or don't, whatever the count.
    expect(none).toMatch(/aria-hidden="true"[\s\S]*Journal<span class="count[^"]*">99<\/span>/)
  })
})
