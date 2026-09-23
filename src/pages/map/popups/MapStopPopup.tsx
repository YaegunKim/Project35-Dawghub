import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StopArrival } from '../../../lib/passio'
import { fetchRouteScheduleStats, getServiceState, type RouteScheduleStats } from '../../../lib/busScheduleStats'
import { formatMinuteOfDay } from '../../../lib/busStats'
import { WEEKDAY_I18N_KEYS } from '../../../lib/dining'
import { S } from './MapStopPopup.style'

type MapStopPopupProps = {
  stopName: string
  // A getter, not a snapshot — pollBuses (MapPage's live bus loop) updates the arrivals this
  // reads from every 8s, so re-invoking it on an interval is what makes the ETA below track
  // real bus movement while the popup stays open, the same way the live bus markers do.
  getArrivals: () => StopArrival[]
}

const REFRESH_INTERVAL_MS = 5000

// When there's no live bus to point at (etaSeconds is null — see passio.ts's
// computeStopArrivals), falls back to RouteScheduleStat's precomputed weekday/hour history to
// say something more useful than a flat "not running": before the usual first bus, after the
// usual last one, or a temporary gap in Passio's own live reporting during the normal window.
function fallbackEtaLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  stats: RouteScheduleStats | null,
  nowIso: string,
): string {
  const state = getServiceState(stats, false, nowIso)
  switch (state.kind) {
    case 'beforeFirstBus':
      return t('map.bus.beforeFirstBus', { time: formatMinuteOfDay(state.expectedMinute) })
    case 'afterLastBus':
      return state.expectedMinute == null
        ? t('map.bus.afterLastBusUnknown')
        : t('map.bus.afterLastBusKnown', {
            weekday: t(`schedule.days.${WEEKDAY_I18N_KEYS[state.expectedWeekday]}`),
            time: formatMinuteOfDay(state.expectedMinute),
          })
    case 'gap':
      return state.medianHeadwayMinutes == null
        ? t('map.bus.notOperating')
        : t('map.bus.headwayEstimate', { minutes: Math.round(state.medianHeadwayMinutes) })
    default:
      return t('map.bus.notOperating')
  }
}

export function MapStopPopup({ stopName, getArrivals }: MapStopPopupProps) {
  const { t } = useTranslation()
  const [arrivals, setArrivals] = useState(getArrivals)
  const [nowIso, setNowIso] = useState(() => new Date().toISOString())

  useEffect(() => {
    const id = setInterval(() => {
      setArrivals(getArrivals())
      setNowIso(new Date().toISOString())
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [getArrivals])

  // Joined into a stable string key rather than depended on as an array — arrivals is a fresh
  // array every 5s poll tick even when the set of routes serving this stop hasn't changed, and
  // an array-identity dependency would refetch RouteScheduleStat on every single tick instead
  // of only when the actual route set changes.
  const routeNamesKey = useMemo(
    () =>
      Array.from(new Set(arrivals.map((arrival) => arrival.route.name)))
        .sort()
        .join('|'),
    [arrivals],
  )

  // This popup is mounted into a detached React root outside the app's own tree (see
  // reactPopup.tsx's bindReactPopup), which has no QueryClientProvider ancestor — useQuery/
  // useQueries would throw here the same reason MapDiningPopup fetches its menu with a plain
  // effect instead. RouteScheduleStat barely changes (once a day), so there's no real cost to
  // skipping the query-cache layer for it.
  const [statsByRoute, setStatsByRoute] = useState<Map<string, RouteScheduleStats | null>>(new Map())

  useEffect(() => {
    if (!routeNamesKey) return
    let cancelled = false
    Promise.all(
      routeNamesKey.split('|').map(async (routeName): Promise<[string, RouteScheduleStats | null]> => {
        try {
          return [routeName, await fetchRouteScheduleStats(routeName)]
        } catch {
          return [routeName, null]
        }
      }),
    ).then((entries) => {
      if (!cancelled) setStatsByRoute(new Map(entries))
    })
    return () => {
      cancelled = true
    }
  }, [routeNamesKey])

  return (
    <S.Wrapper>
      <S.Name>{stopName}</S.Name>
      {arrivals.length === 0 ? (
        <S.Empty>{t('map.bus.noRoutesAtStop')}</S.Empty>
      ) : (
        <>
          <S.RouteList>
            {arrivals.map(({ route, etaSeconds }) => (
              <S.RouteRow key={route.id}>
                <S.RouteBadge $color={route.color}>{route.code}</S.RouteBadge>
                <S.RouteName>{route.name}</S.RouteName>
                <S.Eta $running={etaSeconds != null}>
                  {etaSeconds == null
                    ? fallbackEtaLabel(t, statsByRoute.get(route.name) ?? null, nowIso)
                    : t('map.bus.arrivalEtaMinutes', { count: Math.max(1, Math.round(etaSeconds / 60)) })}
                </S.Eta>
              </S.RouteRow>
            ))}
          </S.RouteList>
          <S.EstimateNote>{t('map.directions.busEtaApprox')}</S.EstimateNote>
        </>
      )}
    </S.Wrapper>
  )
}
