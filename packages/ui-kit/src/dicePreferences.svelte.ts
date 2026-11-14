/**
 * How dice are shown and who rolls them: whether a roll just made tumbles before it settles,
 * whether a throw knocks on the table as it's heard, and who rolls the dice of every trip and
 * scene (`rolls`: the computer, the player what matters, or the player everything; unset until
 * the player first chooses, so a fight can ask). Preferences of this browser,
 * `opentabletop.dice`, shared by every app. The system's "reduce motion" turns tumbling off
 * too, whatever this says.
 */
export const DICE_KEY = 'opentabletop.dice'

/** Who rolls: the computer everything, the player what matters, or the player everything. */
export type DiceRolls = 'computer' | 'matters' | 'all'
export const DICE_ROLLS: readonly DiceRolls[] = ['computer', 'matters', 'all']

/** Where the last way chosen in a trip was kept before it was a preference: read once. */
const OLD_ROLLS_KEY = 'opentabletop.trip.rolls'

class DicePreferences {
  animate = $state(read('animate'))
  sound = $state(read('sound'))
  rolls = $state<DiceRolls | undefined>(readRolls())

  setAnimate(on: boolean): void {
    this.animate = on
    this.save()
  }

  setSound(on: boolean): void {
    this.sound = on
    this.save()
  }

  setRolls(way: DiceRolls): void {
    this.rolls = way
    this.save()
  }

  private save(): void {
    try {
      localStorage.setItem(
        DICE_KEY,
        JSON.stringify({
          animate: this.animate,
          sound: this.sound,
          ...(this.rolls && { rolls: this.rolls }),
        }),
      )
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

function stored(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(DICE_KEY) ?? '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}

/** One of them, on unless turned off. */
function read(key: 'animate' | 'sound'): boolean {
  return stored()[key] !== false
}

/** Who rolls, if the player ever chose it (here, or in a trip before it was a preference). */
function readRolls(): DiceRolls | undefined {
  const rolls = stored().rolls
  if (DICE_ROLLS.includes(rolls as DiceRolls)) return rolls as DiceRolls
  try {
    const old = localStorage.getItem(OLD_ROLLS_KEY)
    if (old === null) return undefined
    const way = (JSON.parse(old) as { way?: unknown }).way
    return DICE_ROLLS.includes(way as DiceRolls) ? (way as DiceRolls) : 'computer'
  } catch {
    return undefined
  }
}

export const dicePreferences = new DicePreferences()
