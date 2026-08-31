import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useFavorites } from '../../lib/useFavorites'
import { DIETARY_ICON_URLS, ALLERGEN_ICON_URLS, HIDDEN_TAGS_KEY } from './dietaryIcons'
import { S } from './DietaryTags.style'

type DietaryTagsProps = {
  dietary?: (string | null)[] | null
  allergens?: (string | null)[] | null
}

export function DietaryTags({ dietary, allergens }: DietaryTagsProps) {
  const { t } = useTranslation()
  const { isFavorite: isHidden } = useFavorites(HIDDEN_TAGS_KEY)
  const dietTags = (dietary ?? []).filter(
    (tag): tag is string => typeof tag === 'string' && tag in DIETARY_ICON_URLS && !isHidden(tag),
  )
  const allergenTags = (allergens ?? []).filter(
    (tag): tag is string => typeof tag === 'string' && tag in ALLERGEN_ICON_URLS && !isHidden(tag),
  )

  if (dietTags.length === 0 && allergenTags.length === 0) return null

  function hideOnError(event: SyntheticEvent<HTMLImageElement>) {
    event.currentTarget.style.display = 'none'
  }

  return (
    <>
      {dietTags.map((tag) => {
        const label = t(`dining.dietary.${tag}`)
        return (
          <S.Icon key={tag} src={DIETARY_ICON_URLS[tag]} alt={label} title={label} loading="lazy" onError={hideOnError} />
        )
      })}
      {allergenTags.map((tag) => {
        const label = t(`dining.allergens.${tag}`)
        return (
          <S.Icon
            key={tag}
            src={ALLERGEN_ICON_URLS[tag]}
            alt={label}
            title={label}
            loading="lazy"
            onError={hideOnError}
          />
        )
      })}
    </>
  )
}
