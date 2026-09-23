import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBus } from '@fortawesome/free-solid-svg-icons'
import { computeStopArrivals, locateBusOnRoute, type PassioBus, type PassioRoute } from '../../lib/passio'
import { S } from './BusRouteStopTimeline.style'

type BusRouteStopTimelineProps = {
  route: PassioRoute
  buses: PassioBus[]
  onSelectStop: (stopId: string) => void
}

// A vertical rail through the route's stops (already in real forward-travel order), with each
// live bus on the route drawn at its actual interpolated position between the two stops it's
// currently between — not snapped to whichever one is nearer. The pixel offset only exists
// after layout (it comes from measuring real row positions, since rows can vary in height once
// a stop has an ETA chip), so it's applied imperatively via refs in useLayoutEffect rather than
// as a React-state-driven inline style (CLAUDE.md: no `style={{...}}` in JSX).
export function BusRouteStopTimeline({ route, buses, onSelectStop }: BusRouteStopTimelineProps) {
  const { t } = useTranslation()
  const listRef = useRef<HTMLDivElement>(null)
  const stopRowRefs = useRef(new Map<string, HTMLButtonElement>())
  const busMarkerRefs = useRef(new Map<string, HTMLDivElement>())

  const routeBuses = buses.filter((bus) => bus.route === route.name)

  useLayoutEffect(() => {
    const container = listRef.current
    if (!container) return
    const containerTop = container.getBoundingClientRect().top

    function centerOf(stopId: string): number | null {
      const el = stopRowRefs.current.get(stopId)
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return rect.top - containerTop + rect.height / 2
    }

    routeBuses.forEach((bus) => {
      const markerEl = busMarkerRefs.current.get(bus.id)
      if (!markerEl) return
      const location = locateBusOnRoute(route, bus)
      const fromStop = location ? route.stops[location.legIndex] : null
      const toStop = location ? route.stops[(location.legIndex + 1) % route.stops.length] : null
      const fromCenter = fromStop ? centerOf(fromStop.id) : null
      const toCenter = toStop ? centerOf(toStop.id) : null

      if (!location || fromCenter == null || toCenter == null) {
        markerEl.style.display = 'none'
        return
      }
      markerEl.style.display = ''
      markerEl.style.top = `${fromCenter + (toCenter - fromCenter) * location.progress}px`
    })
  }, [route, routeBuses])

  return (
    <S.Wrap ref={listRef}>
      <S.Rail />
      {route.stops.map((stop) => {
        // computeStopArrivals only ever reads .id off the stop it's given — color/name/lat/lng
        // aren't part of its matching logic — so a RouteStop can stand in for the PassioStop
        // shape it expects without needing the separate flat stops list here.
        const [arrival] = computeStopArrivals(
          { id: stop.id, name: stop.name, color: '', latitude: stop.latitude, longitude: stop.longitude },
          [route],
          buses,
        )
        return (
          <S.StopRow
            key={stop.id}
            type="button"
            ref={(el) => {
              if (el) stopRowRefs.current.set(stop.id, el)
              else stopRowRefs.current.delete(stop.id)
            }}
            onClick={() => onSelectStop(stop.id)}
          >
            <S.StopDot />
            <S.StopName>{stop.name}</S.StopName>
            {arrival?.etaSeconds != null && (
              <S.EtaChip>{t('map.bus.arrivalEtaMinutes', { count: Math.max(1, Math.round(arrival.etaSeconds / 60)) })}</S.EtaChip>
            )}
          </S.StopRow>
        )
      })}
      {routeBuses.map((bus) => (
        <S.BusMarker
          key={bus.id}
          $color={bus.color}
          ref={(el) => {
            if (el) busMarkerRefs.current.set(bus.id, el)
            else busMarkerRefs.current.delete(bus.id)
          }}
        >
          <FontAwesomeIcon icon={faBus} />
        </S.BusMarker>
      ))}
    </S.Wrap>
  )
}
