export type MapNavigationIntent = {
  type: 'focus' | 'directions'
  lat: number
  lng: number
  label: string
}

// A "pick a point on the map and hand it back" round trip — unlike MapNavigationIntent
// (which navigates TO an already-known point), this one starts with no point yet: the
// origin page stashes its own in-progress state in `draft` (opaque to Map) and navigates
// here; Map enters pick mode and, on tap or cancel, navigates to `returnTo` with a
// MapPickResultState carrying `draft` back unchanged (plus `pickedLocation` if the user
// tapped rather than cancelled). All display text is supplied by the caller so this stays
// reusable by any page, not just Schedule.
export type MapPickIntent = {
  returnTo: string
  hint: string
  cancelLabel: string
  pointLabel: string
  draft?: unknown
}

export type MapPickResultState = {
  draft?: unknown
  pickedLocation?: { lat: number; lng: number; label: string }
}

export type MapLocationState = { mapIntent?: MapNavigationIntent; pickIntent?: MapPickIntent }
