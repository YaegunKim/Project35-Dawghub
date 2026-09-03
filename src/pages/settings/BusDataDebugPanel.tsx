import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faRotate } from '@fortawesome/free-solid-svg-icons'
import { Select } from '../../design-system/Select/Select'
import { client } from '../../lib/amplifyClient'
import { computeSegmentStats, computeStopWeekdayStats, formatMinuteOfDay, type ArrivalRow } from '../../lib/busStats'
import { WEEKDAY_I18N_KEYS } from '../../lib/dining'
import { fetchUgaRoutesAndStops, getBusRouteCode } from '../../lib/passio'
import { S } from './SettingsPage.style'

type BusDataStats = {
  total: number
  routeCounts: { routeName: string; count: number }[]
  distinctStops: number
  earliest: string | null
  latest: string | null
  rows: ArrivalRow[]
}

// list() paginates (DynamoDB scan under the hood) — walk every page so the debug counts
// reflect the whole table, not just whatever the first page happened to return.
async function fetchAllBusStopArrivals(): Promise<BusDataStats> {
  const routeCounts = new Map<string, number>()
  const stopIds = new Set<string>()
  const rows: ArrivalRow[] = []
  let total = 0
  let earliest: string | null = null
  let latest: string | null = null
  let nextToken: string | null | undefined

  do {
    const { data, nextToken: next } = await client.models.BusStopArrival.list({
      nextToken,
      limit: 1000,
    })
    data.forEach((row) => {
      total += 1
      routeCounts.set(row.routeName, (routeCounts.get(row.routeName) ?? 0) + 1)
      stopIds.add(row.stopId)
      if (!earliest || row.arrivedAt < earliest) earliest = row.arrivedAt
      if (!latest || row.arrivedAt > latest) latest = row.arrivedAt
      rows.push({ busId: row.busId, routeName: row.routeName, stopId: row.stopId, stopName: row.stopName, arrivedAt: row.arrivedAt })
    })
    nextToken = next
  } while (nextToken)

  return {
    total,
    routeCounts: Array.from(routeCounts, ([routeName, count]) => ({ routeName, count })).sort((a, b) => b.count - a.count),
    distinctStops: stopIds.size,
    earliest,
    latest,
    rows,
  }
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function daysSince(iso: string | null): number {
  if (!iso) return 0
  return Math.max(1, Math.ceil((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)))
}

// Dev-facing only (raw row counts + derived weekday/segment stats from the BusStopArrival log
// table log-bus-arrivals writes every minute) — collapsed by default and gated behind an
// explicit expand so a Settings page visit doesn't silently pull the whole table every time.
export function BusDataDebugPanel() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  const statsQuery = useQuery({
    queryKey: ['busStopArrivalStats'],
    queryFn: fetchAllBusStopArrivals,
    enabled: expanded,
    staleTime: 60_000,
  })

  const routeStopsQuery = useQuery({
    queryKey: ['ugaRoutesAndStops'],
    queryFn: fetchUgaRoutesAndStops,
    enabled: expanded,
    staleTime: 60_000,
  })

  const activeRoute = selectedRoute ?? statsQuery.data?.routeCounts[0]?.routeName ?? null

  const routeStopOrder = useMemo(() => {
    if (!activeRoute || !routeStopsQuery.data) return []
    return routeStopsQuery.data.routes.find((route) => route.name === activeRoute)?.stops ?? []
  }, [activeRoute, routeStopsQuery.data])

  const routeRows = useMemo(
    () => (activeRoute ? (statsQuery.data?.rows.filter((row) => row.routeName === activeRoute) ?? []) : []),
    [activeRoute, statsQuery.data],
  )

  const stopStats = useMemo(() => computeStopWeekdayStats(routeRows, routeStopOrder), [routeRows, routeStopOrder])
  const segmentStats = useMemo(() => computeSegmentStats(routeRows, routeStopOrder), [routeRows, routeStopOrder])

  return (
    <S.Section>
      <S.SectionTitle>{t('settings.debugBusData')}</S.SectionTitle>
      <S.Card>
        <S.DebugToggleRow type="button" onClick={() => setExpanded((value) => !value)}>
          <S.RowLabel>{t('settings.debugBusDataToggle')}</S.RowLabel>
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
        </S.DebugToggleRow>

        {expanded && (
          <S.DebugBody>
            {statsQuery.isLoading && <S.DebugEmpty>{t('settings.debugLoading')}</S.DebugEmpty>}
            {statsQuery.isError && <S.DebugEmpty>{t('settings.debugError')}</S.DebugEmpty>}

            {statsQuery.data && (
              <>
                <S.DebugStatGrid>
                  <S.DebugStat>
                    <S.DebugStatValue>{statsQuery.data.total.toLocaleString()}</S.DebugStatValue>
                    <S.DebugStatLabel>{t('settings.debugTotalRows')}</S.DebugStatLabel>
                  </S.DebugStat>
                  <S.DebugStat>
                    <S.DebugStatValue>{statsQuery.data.routeCounts.length}</S.DebugStatValue>
                    <S.DebugStatLabel>{t('settings.debugRoutes')}</S.DebugStatLabel>
                  </S.DebugStat>
                  <S.DebugStat>
                    <S.DebugStatValue>{statsQuery.data.distinctStops}</S.DebugStatValue>
                    <S.DebugStatLabel>{t('settings.debugStops')}</S.DebugStatLabel>
                  </S.DebugStat>
                </S.DebugStatGrid>

                <S.Row>
                  <S.RowLabel>{t('settings.debugEarliest')}</S.RowLabel>
                  <S.RowValue>{formatTimestamp(statsQuery.data.earliest)}</S.RowValue>
                </S.Row>
                <S.Row>
                  <S.RowLabel>{t('settings.debugLatest')}</S.RowLabel>
                  <S.RowValue>{formatTimestamp(statsQuery.data.latest)}</S.RowValue>
                </S.Row>

                <S.DebugRouteTable>
                  {statsQuery.data.routeCounts.map(({ routeName, count }) => (
                    <S.DebugRouteRow key={routeName}>
                      <span>{routeName}</span>
                      <span>{count.toLocaleString()}</span>
                    </S.DebugRouteRow>
                  ))}
                </S.DebugRouteTable>

                <S.DebugDataAgeNote>
                  {t('settings.debugDataAge', {
                    days: daysSince(statsQuery.data.earliest),
                    since: formatTimestamp(statsQuery.data.earliest),
                  })}
                </S.DebugDataAgeNote>

                <S.DebugRouteSelectRow>
                  <S.RowLabel>{t('settings.debugRouteSelect')}</S.RowLabel>
                  <Select value={activeRoute ?? ''} onChange={(event) => setSelectedRoute(event.target.value)}>
                    {statsQuery.data.routeCounts.map(({ routeName }) => (
                      <option key={routeName} value={routeName}>
                        {getBusRouteCode(routeName) ? `${getBusRouteCode(routeName)} · ${routeName}` : routeName}
                      </option>
                    ))}
                  </Select>
                </S.DebugRouteSelectRow>

                {routeStopsQuery.isLoading && <S.DebugEmpty>{t('settings.debugLoading')}</S.DebugEmpty>}

                {activeRoute && routeStopOrder.length > 0 && (
                  <>
                    <S.SectionTitle>{t('settings.debugStopScheduleTitle')}</S.SectionTitle>
                    <S.DebugScheduleScroll>
                      <S.DebugScheduleGrid>
                        <S.DebugScheduleHeaderCell />
                        {WEEKDAY_I18N_KEYS.map((key) => (
                          <S.DebugScheduleHeaderCell key={key}>{t(`schedule.daysShort.${key}`)}</S.DebugScheduleHeaderCell>
                        ))}
                        {stopStats.map((stop) => (
                          <Fragment key={stop.stopId}>
                            <S.DebugScheduleStopCell title={stop.stopName}>{stop.stopName}</S.DebugScheduleStopCell>
                            {stop.medianMinuteByDay.map((minute, day) => (
                              <S.DebugScheduleTimeCell key={`${stop.stopId}-${day}`}>
                                {minute == null ? '—' : formatMinuteOfDay(minute)}
                              </S.DebugScheduleTimeCell>
                            ))}
                          </Fragment>
                        ))}
                      </S.DebugScheduleGrid>
                    </S.DebugScheduleScroll>

                    <S.SectionTitle>{t('settings.debugSegmentTitle')}</S.SectionTitle>
                    <S.DebugSegmentList>
                      {segmentStats.map((segment) => (
                        <S.DebugSegmentRow key={`${segment.fromStopId}-${segment.toStopId}`}>
                          <S.DebugSegmentLabel>
                            {segment.fromStopName} → {segment.toStopName}
                          </S.DebugSegmentLabel>
                          <S.DebugSegmentValue>
                            {segment.medianDurationSeconds == null
                              ? t('settings.debugNoSample')
                              : `~${Math.round(segment.medianDurationSeconds / 60)} min (${segment.sampleCount})`}
                          </S.DebugSegmentValue>
                        </S.DebugSegmentRow>
                      ))}
                    </S.DebugSegmentList>
                  </>
                )}
              </>
            )}

            <S.DebugRefreshButton type="button" onClick={() => statsQuery.refetch()} disabled={statsQuery.isFetching}>
              <FontAwesomeIcon icon={faRotate} spin={statsQuery.isFetching} />
              {t('settings.debugRefresh')}
            </S.DebugRefreshButton>
          </S.DebugBody>
        )}
      </S.Card>
    </S.Section>
  )
}
