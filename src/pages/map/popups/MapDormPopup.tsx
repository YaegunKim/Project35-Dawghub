import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { S } from './MapDormPopup.style'

type MapDormPopupProps = {
  buildingName: string
  initialIsMyDorm: boolean
  onToggle: (next: boolean) => void
}

export function MapDormPopup({ buildingName, initialIsMyDorm, onToggle }: MapDormPopupProps) {
  const { t } = useTranslation()
  const [isMine, setIsMine] = useState(initialIsMyDorm)

  function handleClick() {
    const next = !isMine
    setIsMine(next)
    onToggle(next)
  }

  return (
    <S.Wrapper>
      <S.Name>{buildingName}</S.Name>
      <S.Button type="button" $active={isMine} onClick={handleClick}>
        {isMine ? t('map.myDormSet') : t('map.setMyDorm')}
      </S.Button>
    </S.Wrapper>
  )
}
