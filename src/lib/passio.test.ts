import { describe, expect, it } from 'vitest'
import { getBusRouteCode } from './passio'

describe('getBusRouteCode', () => {
  it('maps known route names to their short code', () => {
    expect(getBusRouteCode('Central East')).toBe('A')
    expect(getBusRouteCode('Campus Housing Night')).toBe('CN')
    expect(getBusRouteCode('Weekender East')).toBe('WE')
  })

  it('returns an empty string for an unknown route name', () => {
    expect(getBusRouteCode('Not A Real Route')).toBe('')
  })
})
