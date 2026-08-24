import { client } from './amplifyClient'

export type MapPreference = {
  id: string
  myDormBuilding: string | null
  myAcademicBuildings: string[]
}

let cachedPreference: Promise<MapPreference> | null = null

async function loadOrCreate(): Promise<MapPreference> {
  const { data } = await client.models.MapPreference.list()
  const existing = data[0]
  if (existing) {
    return {
      id: existing.id,
      myDormBuilding: existing.myDormBuilding ?? null,
      myAcademicBuildings: (existing.myAcademicBuildings ?? []).filter((name): name is string => Boolean(name)),
    }
  }

  const { data: created } = await client.models.MapPreference.create({
    myDormBuilding: null,
    myAcademicBuildings: [],
  })
  return {
    id: created!.id,
    myDormBuilding: created!.myDormBuilding ?? null,
    myAcademicBuildings: (created!.myAcademicBuildings ?? []).filter((name): name is string => Boolean(name)),
  }
}

export function fetchMapPreference(): Promise<MapPreference> {
  if (!cachedPreference) cachedPreference = loadOrCreate()
  return cachedPreference
}

export async function updateMapPreference(
  patch: Partial<Pick<MapPreference, 'myDormBuilding' | 'myAcademicBuildings'>>,
): Promise<MapPreference> {
  const current = await fetchMapPreference()
  const { data: updated } = await client.models.MapPreference.update({
    id: current.id,
    ...patch,
  })
  const next: MapPreference = {
    id: current.id,
    myDormBuilding: updated?.myDormBuilding ?? patch.myDormBuilding ?? current.myDormBuilding,
    myAcademicBuildings:
      (updated?.myAcademicBuildings ?? patch.myAcademicBuildings ?? current.myAcademicBuildings)?.filter(
        (name): name is string => Boolean(name),
      ) ?? [],
  }
  cachedPreference = Promise.resolve(next)
  return next
}
