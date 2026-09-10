import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StopArrival } from '../../../lib/passio'
import { S } from './MapStopPopup.style'

type MapStopPopupProps = {
  stopName: string
  // A getter, not a snapshot — pollBuses (MapPage's live bus loop) updates the arrivals this
  // reads from every 8s, so re-invoking it on an interval is what makes the ETA below track
  // real bus movement while the popup stays open, the same way the live bus markers do.
  getArrivals: () => StopArrival[]
}

const REFRESH_INTERVAL_MS = 5000

export function MapStopPopup({ stopName, getArrivals }: MapStopPopupProps) {
  const { t } = useTranslation()
  const [arrivals, setArrivals] = useState(getArrivals)

  useEffect(() => {
    const id = setInterval(() => setArrivals(getArrivals()), REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [getArrivals])

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
                    ? t('map.bus.notOperating')
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
