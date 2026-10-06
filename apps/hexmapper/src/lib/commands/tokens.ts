import type { HexMap, MapToken } from '../model/types'
import type { Command, MapChange } from './command'

const CHANGE: MapChange = { kind: 'tokens' }

export class AddTokenCommand implements Command {
  constructor(private token: MapToken) {}

  apply(map: HexMap): MapChange {
    map.tokens = [...map.tokens, structuredClone(this.token)]
    return CHANGE
  }

  revert(map: HexMap): MapChange {
    map.tokens = map.tokens.filter((t) => t.id !== this.token.id)
    return CHANGE
  }
}

export class RemoveTokenCommand implements Command {
  private index = -1

  constructor(private token: MapToken) {}

  apply(map: HexMap): MapChange {
    this.index = map.tokens.findIndex((t) => t.id === this.token.id)
    map.tokens = map.tokens.filter((t) => t.id !== this.token.id)
    return CHANGE
  }

  revert(map: HexMap): MapChange {
    const tokens = [...map.tokens]
    tokens.splice(Math.max(0, this.index), 0, structuredClone(this.token))
    map.tokens = tokens
    return CHANGE
  }
}

/** Any change to one token (move, rename, restyle…), as before/after snapshots. */
export class ReplaceTokenCommand implements Command {
  constructor(
    private before: MapToken,
    private after: MapToken,
  ) {}

  apply(map: HexMap): MapChange {
    return this.set(map, this.after)
  }

  revert(map: HexMap): MapChange {
    return this.set(map, this.before)
  }

  private set(map: HexMap, token: MapToken): MapChange {
    map.tokens = map.tokens.map((t) => (t.id === token.id ? structuredClone(token) : t))
    return CHANGE
  }
}
