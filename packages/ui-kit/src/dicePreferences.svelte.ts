/**
 * How dice are shown: whether a roll just made tumbles before it settles, and whether a throw
 * knocks on the table as it's heard (preferences of this browser, `opentabletop.dice`, shared
 * by every app). The system's "reduce motion" turns tumbling off too, whatever this says.
 */
export const DICE_KEY = 'opentabletop.dice'

class DicePreferences {
  animate = $state(read('animate'))
  sound = $state(read('sound'))

  setAnimate(on: boolean): void {
    this.animate = on
    this.save()
  }

  setSound(on: boolean): void {
    this.sound = on
    this.save()
  }

  private save(): void {
    try {
      localStorage.setItem(DICE_KEY, JSON.stringify({ animate: this.animate, sound: this.sound }))
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

/** One of them, on unless turned off. */
function read(key: 'animate' | 'sound'): boolean {
  try {
    return (
      (JSON.parse(localStorage.getItem(DICE_KEY) ?? '{}') as Record<string, unknown>)[key] !== false
    )
  } catch {
    return true
  }
}

export const dicePreferences = new DicePreferences()
