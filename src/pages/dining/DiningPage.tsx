import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { DINING_HALLS, getCurrentMealType, sortHallsByFavorite } from '../../lib/dining'
import { useFavorites } from '../../lib/useFavorites'
import { DiningHallCard } from './DiningHallCard'
import { TagSettingsModal } from './TagSettingsModal'
import { S } from './DiningPage.style'

const DINING_FAVORITES_KEY = 'dawghub:dining:favorites'

export function DiningPage() {
  const { t } = useTranslation()
  const { favorites, isFavorite, toggleFavorite } = useFavorites(DINING_FAVORITES_KEY)
  const [mealType] = useState(() => getCurrentMealType())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const orderedHalls = useMemo(() => sortHallsByFavorite(DINING_HALLS, favorites), [favorites])

  return (
    <Page>
      <S.TitleRow>
        <PageTitle>{t('nav.dining')}</PageTitle>
        <IconButton aria-label={t('dining.tagSettings')} onClick={() => setSettingsOpen(true)}>
          <FontAwesomeIcon icon={faGear} />
        </IconButton>
      </S.TitleRow>

      {settingsOpen && <TagSettingsModal onClose={() => setSettingsOpen(false)} />}

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
