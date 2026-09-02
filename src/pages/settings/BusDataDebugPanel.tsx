import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faRotate } from '@fortawesome/free-solid-svg-icons'
import { client } from '../../lib/amplifyClient'
import { S } from './SettingsPage.style'

type BusDataStats = {
  total: number
  routeCounts: { routeName: string; count: number }[]
  distinctStops: number
  earliest: string | null
  latest: string | null
}

// list() paginates (DynamoDB scan under the hood) — walk every page so the debug counts
// reflect the whole table, not just whatever the first page happened to return.
async function fetchAllBusStopArrivals(): Promise<BusDataStats> {
  const routeCounts = new Map<string, number>()
  const stopIds = new Set<string>()
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
    })
    nextToken = next
  } while (nextToken)

  return {
    total,
    routeCounts: Array.from(routeCounts, ([routeName, count]) => ({ routeName, count })).sort((a, b) => b.count - a.count),
    distinctStops: stopIds.size,
    earliest,
    latest,
  }
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

// Dev-facing only (raw row counts from the BusStopArrival log table log-bus-arrivals writes
// every minute) — collapsed by default and gated behind an explicit expand so a Settings page
// visit doesn't silently pull the whole table every time.
export function BusDataDebugPanel() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const statsQuery = useQuery({
    queryKey: ['busStopArrivalStats'],
    queryFn: fetchAllBusStopArrivals,
    enabled: expanded,
    staleTime: 60_000,
  })

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
