export type MapNavigationIntent = {
  type: 'focus' | 'directions'
  lat: number
  lng: number
  label: string
}

export type MapLocationState = { mapIntent?: MapNavigationIntent }
