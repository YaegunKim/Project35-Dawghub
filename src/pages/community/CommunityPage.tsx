import { useTranslation } from 'react-i18next'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { S } from './CommunityPage.style'

const BOARDS = [
  { id: 'general', icon: '📣' },
  { id: 'housing', icon: '🏠' },
  { id: 'classes', icon: '📚' },
  { id: 'buySell', icon: '🛒' },
  { id: 'events', icon: '🎉' },
] as const

export function CommunityPage() {
  const { t } = useTranslation()

  return (
    <Page>
      <PageTitle>{t('nav.community')}</PageTitle>
      <S.BoardList>
        {BOARDS.map((board) => (
          <S.BoardCard key={board.id} to={`/community/${board.id}`}>
            <S.BoardIcon aria-hidden>{board.icon}</S.BoardIcon>
            {t(`community.boards.${board.id}`)}
          </S.BoardCard>
        ))}
      </S.BoardList>
    </Page>
  )
}
