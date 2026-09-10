import { useTranslation } from 'react-i18next'
import { faBullhorn, faHouseChimney, faBookOpen, faCartShopping, faCalendarDay } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { Logo } from '../../design-system/Brand/Logo'
import { category } from '../../design-system/colors'
import { S } from './CommunityPage.style'

const BOARDS = [
  { id: 'general', icon: faBullhorn, color: category.community.general },
  { id: 'housing', icon: faHouseChimney, color: category.community.housing },
  { id: 'classes', icon: faBookOpen, color: category.community.classes },
  { id: 'buySell', icon: faCartShopping, color: category.community.buySell },
  { id: 'events', icon: faCalendarDay, color: category.community.events },
] as const

export function CommunityPage() {
  const { t } = useTranslation()

  return (
    <Page>
      <PageTitle>{t('nav.community')}</PageTitle>
      <S.Banner>
        <Logo size={44} />
        <S.BannerText>{t('community.tagline')}</S.BannerText>
      </S.Banner>
      <S.BoardGrid>
        {BOARDS.map((board) => (
          <S.BoardTile key={board.id} to={`/community/${board.id}`} $color={board.color}>
            <S.TileIcon $color={board.color}>
              <FontAwesomeIcon icon={board.icon} />
            </S.TileIcon>
            <S.TileLabel>{t(`community.boards.${board.id}`)}</S.TileLabel>
            <S.TileSubtitle>{t(`community.boardSubtitles.${board.id}`)}</S.TileSubtitle>
          </S.BoardTile>
        ))}
      </S.BoardGrid>
    </Page>
  )
}
