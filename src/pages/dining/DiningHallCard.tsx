import { useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { faChevronDown, faStar, faThumbtack } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Badge } from '../../design-system/Badge/Badge'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { client } from '../../lib/amplifyClient'
import {
  getDiningHoursToday,
  getDiningMealHoursToday,
  getNextDiningOpen,
  isDiningHallOpenNow,
  splitHoursNote,
  type DiningHall,
} from '../../lib/diningHours'
import {
  PINNED_SECTIONS_KEY,
  filterItemsByTagState,
  formatNextOpenLabel,
  groupMenuItemsBySection,
  sortSectionsByItemCount,
  sortSectionsByPinned,
  type MealType,
} from '../../lib/dining'
import { useFavorites } from '../../lib/useFavorites'
import { useTransitionFlash } from '../../lib/useTransitionFlash'
import { DietaryTags } from './DietaryTags'
import { DiningQuickActions } from './DiningQuickActions'
import { useTagFilters } from './tagFilters'
import { S } from './DiningHallCard.style'

type MenuItem = { name: string; section: string; dietary: string[]; allergens: string[] }

const MAX_PREVIEW_ITEMS = 4
const DINING_MENU_STALE_TIME = 5 * 60_000
const FILTER_TRANSITION_MS = 300

type DiningHallCardProps = {
  hall: DiningHall
  mealType: MealType
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function DiningHallCard({ hall, mealType, isFavorite, onToggleFavorite }: DiningHallCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

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
  const { filters: tagFilters } = useTagFilters()
  const isFilterTransitioning = useTransitionFlash(tagFilters, FILTER_TRANSITION_MS)

  const openNow = isDiningHallOpenNow(hall)
  const nextOpen = openNow ? null : getNextDiningOpen(hall)

  const filteredItems = useMemo(
    () => (items ? filterItemsByTagState(items, tagFilters) : []),
    [items, tagFilters],
  )
  const groupedSections = useMemo(
    () =>
      sortSectionsByPinned(
        sortSectionsByItemCount(groupMenuItemsBySection(filteredItems, t('dining.otherItems'))),
        pinnedSections,
      ),
    [filteredItems, t, pinnedSections],
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

  function handleToggleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setExpanded((prev) => !prev)
  }

  return (
    <S.Card role="link" tabIndex={0} onClick={goToDetail} onKeyDown={handleKeyDown}>
      <S.Header>
        <S.HeaderText>
          <S.HallName>{t(`dining.halls.${hall}`)}</S.HallName>
          <S.Hours>{t('dining.hoursToday', { hours: getDiningHoursToday(hall) })}</S.Hours>
          {nextOpen && <S.NextOpen>{formatNextOpenLabel(t, nextOpen)}</S.NextOpen>}
        </S.HeaderText>
        <S.HeaderActions>
          <Badge variant={openNow ? 'success' : 'danger'}>{t(openNow ? 'dining.open' : 'dining.closed')}</Badge>
          <IconButton
            aria-label={t(isFavorite ? 'dining.favoriteRemove' : 'dining.favoriteAdd')}
            aria-pressed={isFavorite}
            onClick={handleFavoriteClick}
          >
            <FontAwesomeIcon icon={faStar} />
          </IconButton>
        </S.HeaderActions>
      </S.Header>

      <DiningQuickActions hall={hall} />

      <S.MenuRow>
        <S.MenuLabel>{t(`dining.mealTypes.${mealType}`)}</S.MenuLabel>
        <S.MenuTime>{splitHoursNote(getDiningMealHoursToday(hall, mealType)).hours}</S.MenuTime>
      </S.MenuRow>

      <S.ExpandableRegion $expanded={expanded}>
        <S.ExpandableInner>
          {isLoading || isFilterTransitioning ? (
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
          ) : filteredItems.length === 0 ? (
            <S.MenuHint>{t('dining.noMatch')}</S.MenuHint>
          ) : (
            <S.Sections>
              {groupedSections.map(([section, sectionItems]) => {
                const visibleItems = sectionItems.slice(0, MAX_PREVIEW_ITEMS)
                const remaining = sectionItems.length - visibleItems.length
                return (
                  <S.Section key={section}>
                    <S.SectionHeader>
                      <S.SectionDot />
                      <S.SectionTitle>{section}</S.SectionTitle>
                      {pinnedSections.includes(section) && (
                        <S.PinIndicator title={t('dining.pinned')}>
                          <FontAwesomeIcon icon={faThumbtack} />
                        </S.PinIndicator>
                      )}
                    </S.SectionHeader>
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
        </S.ExpandableInner>
      </S.ExpandableRegion>

      <S.ToggleRow
        type="button"
        aria-expanded={expanded}
        onClick={handleToggleClick}
      >
        {t(expanded ? 'dining.hideMenu' : 'dining.showMenu')}
        <S.ToggleChevron $expanded={expanded}>
          <FontAwesomeIcon icon={faChevronDown} />
        </S.ToggleChevron>
      </S.ToggleRow>
    </S.Card>
  )
}
