import styled from '@emotion/styled'
import { NavLink } from 'react-router-dom'
import { radius } from '../../design-system/radius'
import { motion } from '../../design-system/motion'
import { zIndex } from '../../design-system/zIndex'

export const S = {
  Shell: styled.div`
    display: flex;
    flex-direction: column;
    min-height: 100svh;

    @media (min-width: 768px) {
      flex-direction: row;
    }
  `,
  Sidebar: styled.nav`
    display: none;

    @media (min-width: 768px) {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 88px;
      flex-shrink: 0;
      padding: 24px 8px;
      border-right: 1px solid var(--border);
    }

    @media (min-width: 1024px) {
      align-items: stretch;
      width: 240px;
      padding: 24px 16px;
    }
  `,
  Brand: styled.div`
    display: none;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 8px 4px 24px;

    @media (min-width: 768px) {
      display: flex;
    }

    @media (min-width: 1024px) {
      justify-content: flex-start;
      padding: 8px 12px 24px;
    }
  `,
  BrandWordmark: styled.span`
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 18px;
    color: var(--text);
    white-space: nowrap;

    @media (max-width: 1023px) {
      display: none;
    }
  `,
  NavIconWrap: styled.span<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 28px;
    border-radius: ${radius.pill};
    font-size: 15px;
    transition:
      background-color ${motion.duration.fast} ${motion.easing.standard},
      color ${motion.duration.fast} ${motion.easing.standard};
    background: ${({ $active }) => ($active ? 'var(--bg-elevated)' : 'transparent')};
    color: ${({ $active }) => ($active ? 'var(--accent)' : 'inherit')};
  `,
  NavLink: styled(NavLink)`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: ${radius.md};
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    transition: color ${motion.duration.fast} ${motion.easing.standard};

    &.active {
      color: var(--accent);
    }

    @media (max-width: 767px) {
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
      padding: 6px 0;
    }

    @media (min-width: 768px) and (max-width: 1023px) {
      flex-direction: column;
      gap: 2px;
      width: 100%;
      padding: 8px 2px;
      font-size: 10px;
      text-align: center;
    }
  `,
  BottomNav: styled.nav`
    position: sticky;
    bottom: 0;
    z-index: ${zIndex.chrome};
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 64px;
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--bg);
    border-top: 1px solid var(--border);

    @media (min-width: 768px) {
      display: none;
    }
  `,
  Main: styled.main<{ $fullBleed?: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: ${({ $fullBleed }) => ($fullBleed ? '0' : '16px')};

    @media (min-width: 768px) {
      padding: ${({ $fullBleed }) => ($fullBleed ? '0' : '32px')};
    }
  `,
}
