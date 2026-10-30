import type { HexMap, MapConnection } from '@open-tabletop/map'
import type { Command, MapChange } from './command'

const CHANGE: MapChange = { kind: 'connections' }

export class AddConnectionCommand implements Command {
  constructor(private connection: MapConnection) {}

  apply(map: HexMap): MapChange {
    map.connections = [...map.connections, structuredClone(this.connection)]
    return CHANGE
  }

  revert(map: HexMap): MapChange {
    map.connections = map.connections.filter((c) => c.id !== this.connection.id)
    return CHANGE
  }
}

export class RemoveConnectionCommand implements Command {
  private index = -1

  constructor(private connection: MapConnection) {}

  apply(map: HexMap): MapChange {
    this.index = map.connections.findIndex((c) => c.id === this.connection.id)
    map.connections = map.connections.filter((c) => c.id !== this.connection.id)
    return CHANGE
  }

  revert(map: HexMap): MapChange {
    const connections = [...map.connections]
    connections.splice(Math.max(0, this.index), 0, structuredClone(this.connection))
    map.connections = connections
    return CHANGE
  }
}

/** Any change to one connection (its kind, name, tags, values), as before/after snapshots. */
export class ReplaceConnectionCommand implements Command {
  constructor(
    private before: MapConnection,
    private after: MapConnection,
  ) {}

  apply(map: HexMap): MapChange {
    return this.set(map, this.after)
  }

  revert(map: HexMap): MapChange {
    return this.set(map, this.before)
  }

  private set(map: HexMap, connection: MapConnection): MapChange {
    map.connections = map.connections.map((c) =>
      c.id === connection.id ? structuredClone(connection) : c,
    )
    return CHANGE
  }
}
