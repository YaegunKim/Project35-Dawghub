import { useTranslation } from 'react-i18next'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { Logo } from '../../design-system/Brand/Logo'
import { useTheme, type Theme } from '../../app/ThemeContext'
import { S } from './SettingsPage.style'

type SettingsPageProps = {
  userEmail?: string
  onSignOut?: () => void
}

export function SettingsPage({ userEmail, onSignOut }: SettingsPageProps) {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

  const languages = [
    { code: 'ko', labelKey: 'settings.languageKorean' },
    { code: 'en', labelKey: 'settings.languageEnglish' },
  ] as const

  const themes: { value: Theme; labelKey: string }[] = [
    { value: 'system', labelKey: 'settings.themeSystem' },
    { value: 'light', labelKey: 'settings.themeLight' },
    { value: 'dark', labelKey: 'settings.themeDark' },
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
            <S.Segmented>
              {languages.map((lang) => (
                <S.SegmentButton
                  key={lang.code}
                  type="button"
                  $active={i18n.language === lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                >
                  {t(lang.labelKey)}
                </S.SegmentButton>
              ))}
            </S.Segmented>
          </S.Row>
          <S.Row>
            <S.RowLabel>{t('settings.theme')}</S.RowLabel>
            <S.Segmented>
              {themes.map((option) => (
                <S.SegmentButton
                  key={option.value}
                  type="button"
                  $active={theme === option.value}
                  onClick={() => setTheme(option.value)}
                >
                  {t(option.labelKey)}
                </S.SegmentButton>
              ))}
            </S.Segmented>
          </S.Row>
        </S.Card>
      </S.Section>

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
