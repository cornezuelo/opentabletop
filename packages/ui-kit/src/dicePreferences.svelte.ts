/**
 * How dice are shown: whether a roll just made tumbles before it settles (a preference of
 * this browser, `opentabletop.dice`, shared by every app). The system's "reduce motion" turns
 * it off too, whatever this says.
 */
export const DICE_KEY = 'opentabletop.dice'

class DicePreferences {
  animate = $state(readAnimate())

  setAnimate(on: boolean): void {
    this.animate = on
    try {
      localStorage.setItem(DICE_KEY, JSON.stringify({ animate: on }))
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

function readAnimate(): boolean {
  try {
    return (
      (JSON.parse(localStorage.getItem(DICE_KEY) ?? '{}') as { animate?: unknown }).animate !==
      false
    )
  } catch {
    return true
  }
}

export const dicePreferences = new DicePreferences()
