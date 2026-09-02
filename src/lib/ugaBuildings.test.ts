import { describe, expect, it } from 'vitest'
import { fetchUgaBuildings, findBuildingByName, type UgaBuilding } from './ugaBuildings'

const buildings: UgaBuilding[] = [
  { name: 'Miller Learning Center', buildingUse: 'Academic', latitude: 1, longitude: 2 },
  { name: 'The Niche', buildingUse: 'Student Life', latitude: 3, longitude: 4 },
]

describe('findBuildingByName', () => {
  it('matches case-insensitively on an exact name', () => {
    expect(findBuildingByName(buildings, 'the niche')?.name).toBe('The Niche')
  })

  it('falls back to a substring match when the query is inside a building name', () => {
    expect(findBuildingByName(buildings, 'learning center')?.name).toBe('Miller Learning Center')
  })

  it('falls back to a substring match when a building name is inside the query', () => {
    expect(findBuildingByName(buildings, 'The Niche (Health Sciences Campus)')?.name).toBe('The Niche')
  })

  it('returns undefined for an empty or unmatched query', () => {
    expect(findBuildingByName(buildings, '')).toBeUndefined()
    expect(findBuildingByName(buildings, 'Nonexistent Hall')).toBeUndefined()
  })
})

describe('fetchUgaBuildings', () => {
  it('includes the manually-hardcoded halls missing from the GIS layer', async () => {
    const all = await fetchUgaBuildings()
    const names = all.map((b) => b.name)
    expect(names).toContain('Hillside Dining Commons')
    expect(names).toContain('The Niche')
    expect(names).toContain('Village Summit Dining Commons')
  })
})
