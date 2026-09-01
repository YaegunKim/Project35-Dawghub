import { Global, css } from '@emotion/react'
import { typography } from './typography'
import { motion } from './motion'

const DARK_THEME_VARS = `
  --bg: #121218;
  --bg-elevated: #1b1c22;
  --text: #f3f4f6;
  --text-muted: #9ca3af;
  --border: #2e303a;
  --accent: #ff5c72;
  --accent-contrast: #16171d;
`

const styles = css`
  :root {
    --bg: #ffffff;
    --bg-elevated: #f7f7f9;
    --text: #16171d;
    --text-muted: #6b6f76;
    --border: #e5e4e7;
    --accent: #ba0c2f;
    --accent-contrast: #ffffff;
    --font-body: ${typography.fontFamily.body};
    --font-display: ${typography.fontFamily.display};

    color-scheme: light dark;

    --amplify-colors-brand-primary-10: color-mix(in srgb, var(--accent) 10%, white);
    --amplify-colors-brand-primary-80: var(--accent);
    --amplify-colors-brand-primary-90: var(--accent);
    --amplify-colors-brand-primary-100: var(--accent);
    --amplify-colors-font-interactive: var(--accent);
    --amplify-components-button-primary-background-color: var(--accent);
    --amplify-components-button-primary-hover-background-color: color-mix(in srgb, var(--accent) 85%, black);
    --amplify-components-fieldcontrol-focus-border-color: var(--accent);
  }

  [data-amplify-authenticator] {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100svh;
  }

  /* "system" theme (no explicit override): follow the OS, unless the user forced light mode */
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      ${DARK_THEME_VARS}
    }
  }

  /* explicit user override via Settings, wins regardless of OS preference */
  :root[data-theme='dark'] {
    ${DARK_THEME_VARS}
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
  }

  html {
    /* Belt-and-suspenders for the viewport meta's user-scalable=no — some browsers (notably
       iOS Safari) still allow double-tap-to-zoom without this, even with pinch-zoom disabled. */
    touch-action: manipulation;
  }

  body {
    margin: 0;
    overflow-x: hidden;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    transition:
      background-color ${motion.duration.base} ${motion.easing.standard},
      color ${motion.duration.base} ${motion.easing.standard};
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`

export function GlobalStyles() {
  return <Global styles={styles} />
}
