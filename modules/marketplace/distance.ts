export type Coordinates = { latitude: number; longitude: number }

export function parseSearchCoordinates(input: { latitude?: string; longitude?: string }): Coordinates | null {
  if (input.latitude === undefined || input.longitude === undefined) return null
  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return { latitude, longitude }
}

const radians = (degrees: number) => degrees * Math.PI / 180

export function distanceKm(origin: Coordinates, target: Coordinates) {
  if (origin.latitude === target.latitude && origin.longitude === target.longitude) return 0
  const latitudeDelta = radians(target.latitude - origin.latitude)
  const longitudeDelta = radians(target.longitude - origin.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(origin.latitude)) * Math.cos(radians(target.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
