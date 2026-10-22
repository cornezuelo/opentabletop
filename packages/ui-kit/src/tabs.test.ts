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
})
