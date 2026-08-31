import { useTranslation } from 'react-i18next'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { DIETARY_ICON_URLS, ALLERGEN_ICON_URLS } from './dietaryIcons'
import { useTagFilters, type TagFilterState } from './tagFilters'
import { S } from './TagSettingsModal.style'

const DIETARY_TAGS = Object.keys(DIETARY_ICON_URLS)
const ALLERGEN_TAGS = Object.keys(ALLERGEN_ICON_URLS)
const STATES: TagFilterState[] = ['show', 'hide']

type TagSettingsModalProps = {
  onClose: () => void
}

export function TagSettingsModal({ onClose }: TagSettingsModalProps) {
  const { t } = useTranslation()
  const { filters, getState, setState, reset } = useTagFilters()
  const hasActiveFilters = Object.keys(filters).length > 0

  function renderRow(tag: string, icon: string, label: string) {
    const current = getState(tag)
    return (
      <S.Row key={tag}>
        <S.RowIcon src={icon} alt="" />
        <S.RowLabel>{label}</S.RowLabel>
        <S.SegmentedGroup>
          {STATES.map((option) => (
            <S.Segment
              key={option}
              type="button"
              $active={current === option}
              $variant={option}
              aria-pressed={current === option}
              onClick={() => setState(tag, option)}
            >
              {t(`dining.tagFilter.${option}`)}
            </S.Segment>
          ))}
        </S.SegmentedGroup>
      </S.Row>
    )
  }

  return (
    <S.ModalBackdrop onClick={onClose}>
      <S.Modal onClick={(event) => event.stopPropagation()}>
        <S.ModalHeader>
          <S.ModalTitle>{t('dining.tagSettings')}</S.ModalTitle>
          <S.HeaderActions>
            {hasActiveFilters && <S.ResetButton onClick={reset}>{t('dining.resetFilters')}</S.ResetButton>}
            <IconButton aria-label={t('schedule.close')} onClick={onClose}>
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </S.HeaderActions>
        </S.ModalHeader>
        <S.ModalBody>
          <S.Section>
            <S.SectionTitle>{t('dining.dietarySection')}</S.SectionTitle>
            {DIETARY_TAGS.map((tag) => renderRow(tag, DIETARY_ICON_URLS[tag], t(`dining.dietary.${tag}`)))}
          </S.Section>
          <S.Section>
            <S.SectionTitle>{t('dining.allergenSection')}</S.SectionTitle>
            {ALLERGEN_TAGS.map((tag) => renderRow(tag, ALLERGEN_ICON_URLS[tag], t(`dining.allergens.${tag}`)))}
          </S.Section>
        </S.ModalBody>
      </S.Modal>
    </S.ModalBackdrop>
  )
}
