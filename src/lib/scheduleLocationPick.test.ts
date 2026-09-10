import { describe, expect, it } from 'vitest'
import { buildClassMapIntent } from './scheduleLocationPick'

describe('buildClassMapIntent', () => {
  it('prefers exact locationLat/locationLng when present', async () => {
    const intent = await buildClassMapIntent(
      { location: 'Selected location', locationLat: 33.95, locationLng: -83.38 },
      'directions',
    )
    expect(intent).toEqual({ type: 'directions', lat: 33.95, lng: -83.38, label: 'Selected location' })
  })

  it('falls back to matching the free-text location against the UGA building list', async () => {
    const intent = await buildClassMapIntent({ location: 'Conner Hall 0104', locationLat: null, locationLng: null }, 'directions')
    expect(intent?.label).toBe('Conner Hall')
    expect(intent?.type).toBe('directions')
  })

  it('returns null when there is no location at all', async () => {
    const intent = await buildClassMapIntent({ location: null, locationLat: null, locationLng: null }, 'directions')
    expect(intent).toBeNull()
  })

  it('returns null when the free-text location matches no building', async () => {
    const intent = await buildClassMapIntent({ location: 'Nonexistent Hall 9999', locationLat: null, locationLng: null }, 'directions')
    expect(intent).toBeNull()
  })
})
