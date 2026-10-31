import { describe, expect, it } from 'vitest'
import { initialTravelState } from '@open-tabletop/travel-engine'
import { initialSessionState } from './index'
import { moveTrip } from './submaps'

describe('a trip carried to another map of its tree', () => {
  const travel = {
    ...initialTravelState({ location: '@tunnel/0,0', mode: 'foot' }),
    destination: '9,9',
    route: ['@tunnel/0,0', '@tunnel/1,0'],
    visits: { '2,2': 1, '@tunnel/0,0': 1 },
  }
  const session = initialSessionState(travel)

  it('names the places of each map from the one it enters, the destination too', () => {
    const moved = moveTrip(session, 'land', 'tunnel')
    expect(moved.travel.location).toBe('0,0')
    expect(moved.travel.visits).toEqual({ '@land/2,2': 1, '0,0': 1 })
    // Heading on beyond the tunnel, out by another of its ways: planned again there.
    expect(moved.travel.destination).toBe('@land/9,9')
    expect(moved.travel.route).toBeUndefined()
    // The trip given is left as it was.
    expect(session.travel.destination).toBe('9,9')
  })
})
