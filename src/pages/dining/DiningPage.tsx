import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { DINING_HALLS, getCurrentMealType, sortHallsByFavorite } from '../../lib/dining'
import { useFavorites } from '../../lib/useFavorites'
import { DiningHallCard } from './DiningHallCard'
import { S } from './DiningPage.style'

const DINING_FAVORITES_KEY = 'dawghub:dining:favorites'

export function DiningPage() {
  const { t } = useTranslation()
  const { favorites, isFavorite, toggleFavorite } = useFavorites(DINING_FAVORITES_KEY)
  const [mealType] = useState(() => getCurrentMealType())

  const orderedHalls = useMemo(() => sortHallsByFavorite(DINING_HALLS, favorites), [favorites])

  return (
    <Page>
      <PageTitle>{t('nav.dining')}</PageTitle>

      <S.HallList>
        {orderedHalls.map((hall) => (
          <DiningHallCard
            key={hall}
            hall={hall}
            mealType={mealType}
            isFavorite={isFavorite(hall)}
            onToggleFavorite={() => toggleFavorite(hall)}
          />
        ))}
      </S.HallList>
    </Page>
  )
}
