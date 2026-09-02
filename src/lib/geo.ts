export type LatLng = { lat: number; lng: number }

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const earthRadiusMeters = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(sinLat))
}
