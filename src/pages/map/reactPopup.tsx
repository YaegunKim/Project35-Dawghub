import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type L from 'leaflet'

// Leaflet popups take a plain DOM node, so this mounts a React tree into a
// detached container and keeps the popup sized correctly as that tree's
// content changes (e.g. a menu list arriving after its own fetch resolves).
export function bindReactPopup(
  marker: L.Marker | L.CircleMarker,
  node: ReactNode,
  options?: L.PopupOptions,
) {
  const container = document.createElement('div')
  createRoot(container).render(node)

  marker.bindPopup(container, { minWidth: 200, maxWidth: 260, ...options })

  const observer = new ResizeObserver(() => {
    marker.getPopup()?.update()
  })
  observer.observe(container)

  return marker
}
