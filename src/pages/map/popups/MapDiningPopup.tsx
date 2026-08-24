import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { client } from '../../../lib/amplifyClient'
import { getDiningHoursToday, type DiningHall } from '../../../lib/diningHours'
import { getCurrentMealType } from '../../../lib/dining'
import { S as HallCardS } from '../../dining/DiningHallCard.style'
import { S } from './MapDiningPopup.style'

type MenuItem = { name: string }

type MapDiningPopupProps = {
  hall: DiningHall
  label: string
}

export function MapDiningPopup({ hall, label }: MapDiningPopupProps) {
  const { t } = useTranslation()
  const mealType = getCurrentMealType()
  const [items, setItems] = useState<MenuItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setItems(null)

    client.queries
      .getDiningMenu({ hallSlug: hall, mealType })
      .then(({ data }) => {
        if (cancelled) return
        const rawItems = data?.items?.filter((item): item is NonNullable<typeof item> => Boolean(item?.name)) ?? []
        setItems(rawItems.map((item) => ({ name: item.name as string })))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setItems([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [hall, mealType])

  return (
    <S.Wrapper>
      <HallCardS.HallName>{label}</HallCardS.HallName>
      <HallCardS.Hours>{t('dining.hoursToday', { hours: getDiningHoursToday(hall) })}</HallCardS.Hours>

      <HallCardS.MenuLabel>{t(`dining.mealTypes.${mealType}`)}</HallCardS.MenuLabel>
      <S.MenuScroll>
        {loading ? (
          <HallCardS.MenuHint>{t('dining.loading')}</HallCardS.MenuHint>
        ) : !items || items.length === 0 ? (
          <HallCardS.MenuHint>{t('dining.empty')}</HallCardS.MenuHint>
        ) : (
          items.map((item, index) => <S.MenuPill key={`${item.name}-${index}`}>{item.name}</S.MenuPill>)
        )}
      </S.MenuScroll>

      <S.ViewLink href={`/dining/${hall}`}>{t('map.viewMenu')} →</S.ViewLink>
    </S.Wrapper>
  )
}
