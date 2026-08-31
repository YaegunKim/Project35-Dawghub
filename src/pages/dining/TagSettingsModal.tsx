import { useTranslation } from 'react-i18next'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { DIETARY_ICON_URLS, ALLERGEN_ICON_URLS } from './dietaryIcons'
import { useTagFilters } from './tagFilters'
import { S } from './TagSettingsModal.style'

const DIETARY_TAGS = Object.keys(DIETARY_ICON_URLS)
const ALLERGEN_TAGS = Object.keys(ALLERGEN_ICON_URLS)

type TagSettingsModalProps = {
  onClose: () => void
}

export function TagSettingsModal({ onClose }: TagSettingsModalProps) {
  const { t } = useTranslation()
  const { filters, getState, cycleState, reset } = useTagFilters()
  const hasActiveFilters = Object.keys(filters).length > 0

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
            {DIETARY_TAGS.map((tag) => (
              <S.Row key={tag}>
                <S.RowIcon src={DIETARY_ICON_URLS[tag]} alt="" />
                <S.RowLabel>{t(`dining.dietary.${tag}`)}</S.RowLabel>
                <S.StateButton $state={getState(tag)} onClick={() => cycleState(tag)}>
                  {t(`dining.tagFilter.${getState(tag)}`)}
                </S.StateButton>
              </S.Row>
            ))}
          </S.Section>
          <S.Section>
            <S.SectionTitle>{t('dining.allergenSection')}</S.SectionTitle>
            {ALLERGEN_TAGS.map((tag) => (
              <S.Row key={tag}>
                <S.RowIcon src={ALLERGEN_ICON_URLS[tag]} alt="" />
                <S.RowLabel>{t(`dining.allergens.${tag}`)}</S.RowLabel>
                <S.StateButton $state={getState(tag)} onClick={() => cycleState(tag)}>
                  {t(`dining.tagFilter.${getState(tag)}`)}
                </S.StateButton>
              </S.Row>
            ))}
          </S.Section>
        </S.ModalBody>
      </S.Modal>
    </S.ModalBackdrop>
  )
}
