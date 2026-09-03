import { useTranslation } from 'react-i18next'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { Logo } from '../../design-system/Brand/Logo'
import { SegmentedControl } from '../../design-system/SegmentedControl/SegmentedControl'
import { useTheme, type Theme } from '../../app/ThemeContext'
import { BusDataDebugPanel } from './BusDataDebugPanel'
import { S } from './SettingsPage.style'

type SettingsPageProps = {
  userEmail?: string
  onSignOut?: () => void
}

export function SettingsPage({ userEmail, onSignOut }: SettingsPageProps) {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

  const languageOptions = [
    { value: 'ko', label: t('settings.languageKorean') },
    { value: 'en', label: t('settings.languageEnglish') },
  ] as const

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ]

  return (
    <Page>
      <PageTitle>{t('nav.settings')}</PageTitle>

      <S.Section>
        <S.SectionTitle>{t('settings.account')}</S.SectionTitle>
        <S.Card>
          <S.Row>
            <S.RowLabel>{t('settings.email')}</S.RowLabel>
            <S.RowValue>{userEmail}</S.RowValue>
          </S.Row>
        </S.Card>
        {onSignOut && <S.SignOutButton onClick={onSignOut}>{t('nav.signOut')}</S.SignOutButton>}
      </S.Section>

      <S.Section>
        <S.SectionTitle>{t('settings.preferences')}</S.SectionTitle>
        <S.Card>
          <S.Row>
            <S.RowLabel>{t('settings.language')}</S.RowLabel>
            <SegmentedControl
              options={languageOptions}
              value={i18n.language as 'ko' | 'en'}
              onChange={(code) => i18n.changeLanguage(code)}
            />
          </S.Row>
          <S.Row>
            <S.RowLabel>{t('settings.theme')}</S.RowLabel>
            <SegmentedControl options={themeOptions} value={theme} onChange={setTheme} />
          </S.Row>
        </S.Card>
      </S.Section>

      <BusDataDebugPanel />

      <S.Section>
        <S.SectionTitle>{t('settings.about')}</S.SectionTitle>
        <S.Card>
          <S.AboutRow>
            <Logo size={36} withWordmark />
            <S.VersionText>{t('settings.version', { version: __APP_VERSION__ })}</S.VersionText>
          </S.AboutRow>
        </S.Card>
      </S.Section>
    </Page>
  )
}
