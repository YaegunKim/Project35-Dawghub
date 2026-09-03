import { useTranslation } from 'react-i18next'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Modal } from '../../design-system/Modal/Modal'
import { SegmentedControl } from '../../design-system/SegmentedControl/SegmentedControl'
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
  const { filters, getState, setState, reset } = useTagFilters()
  const hasActiveFilters = Object.keys(filters).length > 0

  const stateOptions = [
    { value: 'show' as const, label: t('dining.tagFilter.show') },
    { value: 'hide' as const, label: t('dining.tagFilter.hide') },
  ]

  function renderRow(tag: string, icon: string, label: string) {
    return (
      <S.Row key={tag}>
        <S.RowIcon src={icon} alt="" />
        <S.RowLabel>{label}</S.RowLabel>
        <SegmentedControl
          options={stateOptions}
          value={getState(tag)}
          onChange={(next) => setState(tag, next)}
          getVariant={(value) => (value === 'hide' ? 'danger' : 'neutral')}
        />
      </S.Row>
    )
  }

  return (
    <Modal onClose={onClose}>
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
    </Modal>
  )
}
