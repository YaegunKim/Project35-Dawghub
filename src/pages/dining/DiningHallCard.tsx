import { useMemo, type KeyboardEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { client } from '../../lib/amplifyClient'
import { getDiningHoursToday, getDiningMealHoursToday, splitHoursNote, type DiningHall } from '../../lib/diningHours'
import { PINNED_SECTIONS_KEY, groupMenuItemsBySection, sortSectionsByPinned, type MealType } from '../../lib/dining'
import { useFavorites } from '../../lib/useFavorites'
import { DietaryTags } from './DietaryTags'
import { S } from './DiningHallCard.style'

type MenuItem = { name: string; section: string; dietary: string[]; allergens: string[] }

const MAX_PREVIEW_ITEMS = 4
const DINING_MENU_STALE_TIME = 5 * 60_000

type DiningHallCardProps = {
  hall: DiningHall
  mealType: MealType
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function DiningHallCard({ hall, mealType, isFavorite, onToggleFavorite }: DiningHallCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: items, isLoading } = useQuery({
    queryKey: ['diningMenu', hall, mealType],
    queryFn: async (): Promise<MenuItem[]> => {
      const { data } = await client.queries.getDiningMenu({ hallSlug: hall, mealType })
      const rawItems = data?.items?.filter((item): item is NonNullable<typeof item> => Boolean(item?.name)) ?? []
      return rawItems.map((item) => ({
        name: item.name as string,
        section: item.section ?? '',
        dietary: (item.dietary ?? []).filter((tag): tag is string => Boolean(tag)),
        allergens: (item.allergens ?? []).filter((tag): tag is string => Boolean(tag)),
      }))
    },
    staleTime: DINING_MENU_STALE_TIME,
  })

  const { favorites: pinnedSections } = useFavorites(PINNED_SECTIONS_KEY)

  const groupedSections = useMemo(
    () => (items ? sortSectionsByPinned(groupMenuItemsBySection(items, t('dining.otherItems')), pinnedSections) : []),
    [items, t, pinnedSections],
  )

  function goToDetail() {
    navigate(`/dining/${hall}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter') goToDetail()
  }

  function handleFavoriteClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onToggleFavorite()
  }

  return (
    <S.Card role="link" tabIndex={0} onClick={goToDetail} onKeyDown={handleKeyDown}>
      <S.Header>
        <S.HeaderText>
          <S.HallName>{t(`dining.halls.${hall}`)}</S.HallName>
          <S.Hours>{t('dining.hoursToday', { hours: getDiningHoursToday(hall) })}</S.Hours>
        </S.HeaderText>
        <IconButton
          aria-label={t(isFavorite ? 'dining.favoriteRemove' : 'dining.favoriteAdd')}
          aria-pressed={isFavorite}
          onClick={handleFavoriteClick}
        >
          {isFavorite ? '★' : '☆'}
        </IconButton>
      </S.Header>

      <S.MenuRow>
        <S.MenuLabel>{t(`dining.mealTypes.${mealType}`)}</S.MenuLabel>
        <S.MenuTime>{splitHoursNote(getDiningMealHoursToday(hall, mealType)).hours}</S.MenuTime>
      </S.MenuRow>

      {isLoading ? (
        <S.Sections>
          <S.Section>
            <Skeleton height="11px" width="35%" />
            <S.ItemList>
              {[70, 55, 40].map((width, i) => (
                <S.Item key={i}>
                  <Skeleton height="14px" width={`${width}%`} radius="999px" />
                </S.Item>
              ))}
            </S.ItemList>
          </S.Section>
        </S.Sections>
      ) : !items || items.length === 0 ? (
        <S.MenuHint>{t('dining.empty')}</S.MenuHint>
      ) : (
        <S.Sections>
          {groupedSections.map(([section, sectionItems]) => {
            const visibleItems = sectionItems.slice(0, MAX_PREVIEW_ITEMS)
            const remaining = sectionItems.length - visibleItems.length
            return (
              <S.Section key={section}>
                <S.SectionTitle>{section}</S.SectionTitle>
                <S.ItemList>
                  {visibleItems.map((item, index) => (
                    <S.Item key={`${item.name}-${index}`}>
                      <S.ItemName>{item.name}</S.ItemName>
                      <S.ItemTags>
                        <DietaryTags dietary={item.dietary} allergens={item.allergens} />
                      </S.ItemTags>
                    </S.Item>
                  ))}
                  {remaining > 0 && <S.MoreHint>{t('dining.moreItems', { count: remaining })}</S.MoreHint>}
                </S.ItemList>
              </S.Section>
            )
          })}
        </S.Sections>
      )}
    </S.Card>
  )
}
