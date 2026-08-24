import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { client } from '../../lib/amplifyClient'
import { getDiningHoursToday, type DiningHall } from '../../lib/diningHours'
import { MEAL_TYPES, getCurrentMealType, groupMenuItemsBySection, type MealType } from '../../lib/dining'
import { DietaryTags } from './DietaryTags'
import { S } from './DiningHallDetailPage.style'

const VALID_HALLS: DiningHall[] = ['bolton', 'hillside', 'oglethorpe', 'snelling', 'niche', 'villageSummit']
const DINING_MENU_STALE_TIME = 5 * 60_000

function isDiningHall(value: string | undefined): value is DiningHall {
  return !!value && (VALID_HALLS as string[]).includes(value)
}

type MenuItem = { name: string; section: string; dietary: string[]; allergens: string[] }

export function DiningHallDetailPage() {
  const { hallSlug } = useParams<{ hallSlug: string }>()
  const { t } = useTranslation()
  const [mealType, setMealType] = useState<MealType>(() => getCurrentMealType())

  const hall = isDiningHall(hallSlug) ? hallSlug : null

  const { data: items, isLoading } = useQuery({
    queryKey: ['diningMenu', hall, mealType],
    queryFn: async (): Promise<MenuItem[]> => {
      const { data } = await client.queries.getDiningMenu({ hallSlug: hall!, mealType })
      const rawItems = data?.items?.filter((item): item is NonNullable<typeof item> => Boolean(item?.name)) ?? []
      return rawItems.map((item) => ({
        name: item.name as string,
        section: item.section ?? '',
        dietary: (item.dietary ?? []).filter((tag): tag is string => Boolean(tag)),
        allergens: (item.allergens ?? []).filter((tag): tag is string => Boolean(tag)),
      }))
    },
    enabled: !!hall,
    staleTime: DINING_MENU_STALE_TIME,
  })

  const groupedItems = useMemo(
    () => (items ? groupMenuItemsBySection(items, t('dining.otherItems')) : []),
    [items, t],
  )

  if (!hall) {
    return (
      <Page>
        <BackLink to="/dining">{t('dining.backToList')}</BackLink>
        <EmptyState>{t('dining.empty')}</EmptyState>
      </Page>
    )
  }

  return (
    <Page>
      <BackLink to="/dining">{t('dining.backToList')}</BackLink>
      <S.Header>
        <PageTitle>{t(`dining.halls.${hall}`)}</PageTitle>
        <S.HoursToday>{t('dining.hoursToday', { hours: getDiningHoursToday(hall) })}</S.HoursToday>
      </S.Header>

      <S.MealTabs role="tablist">
        {MEAL_TYPES.map((meal) => (
          <S.MealTab
            key={meal}
            type="button"
            role="tab"
            aria-selected={meal === mealType}
            $active={meal === mealType}
            onClick={() => setMealType(meal)}
          >
            {t(`dining.mealTypes.${meal}`)}
          </S.MealTab>
        ))}
      </S.MealTabs>

      {isLoading ? (
        <S.Sections>
          {[0, 1].map((section) => (
            <S.Section key={section}>
              <Skeleton height="11px" width="30%" />
              <S.ItemList>
                {[75, 60, 50].map((width, i) => (
                  <S.Item key={i}>
                    <Skeleton height="14px" width={`${width}%`} radius="999px" />
                  </S.Item>
                ))}
              </S.ItemList>
            </S.Section>
          ))}
        </S.Sections>
      ) : !items || items.length === 0 ? (
        <EmptyState>{t('dining.empty')}</EmptyState>
      ) : (
        <S.Sections>
          {groupedItems.map(([section, sectionItems]) => (
            <S.Section key={section}>
              <S.SectionTitle>{section}</S.SectionTitle>
              <S.ItemList>
                {sectionItems.map((item, index) => (
                  <S.Item key={`${item.name}-${index}`}>
                    <S.ItemName>{item.name}</S.ItemName>
                    <S.ItemTags>
                      <DietaryTags dietary={item.dietary} allergens={item.allergens} />
                    </S.ItemTags>
                  </S.Item>
                ))}
              </S.ItemList>
            </S.Section>
          ))}
        </S.Sections>
      )}
    </Page>
  )
}
