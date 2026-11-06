const KEY = 'opentabletop.map.panelWidth'

/** How wide the side panel can be, in pixels. */
export const PANEL_WIDTH = { min: 300, max: 480 }
/** Room for a trip's four tabs side by side. */
const USUAL = 340

function read(): number {
  try {
    const kept = Number(localStorage.getItem(KEY))
    return kept >= PANEL_WIDTH.min && kept <= PANEL_WIDTH.max ? kept : USUAL
  } catch {
    return USUAL
  }
}

/** The side panel's width: a preference of this browser. */
export const panelWidth = $state({ value: read() })

export function setPanelWidth(value: number): void {
  panelWidth.value = value
  try {
    localStorage.setItem(KEY, String(value))
  } catch {
    // No storage: it stays until the page reloads.
  }
}
