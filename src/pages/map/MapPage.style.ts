import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'
import { brand } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { spacing } from '../../design-system/spacing'
import { motion } from '../../design-system/motion'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`

export const S = {
  Root: styled.div`
    position: relative;
    flex: 1;
    min-height: 0;
  `,
  MapContainer: styled.div`
    position: absolute;
    inset: 0;
  `,
  LayersButton: styled.button<{ $active: boolean }>`
    position: absolute;
    top: ${spacing.base};
    right: ${spacing.base};
    z-index: 1000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: ${radius.pill};
    border: 1px solid var(--border);
    background: var(--bg);
    color: ${({ $active }) => ($active ? 'var(--accent)' : 'var(--text)')};
    font-size: 18px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
    cursor: pointer;
    transition:
      color ${motion.duration.fast} ${motion.easing.standard},
      transform ${motion.duration.fast} ${motion.easing.standard};

    &:active {
      transform: scale(0.94);
    }
  `,
  DrawerBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0, 0, 0, 0.4);
    animation: ${fadeIn} ${motion.duration.base} ${motion.easing.standard};
  `,
  Drawer: styled.div`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1101;
    width: min(340px, 88vw);
    display: flex;
    flex-direction: column;
    background: var(--bg);
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
    animation: ${slideIn} ${motion.duration.base} ${motion.easing.standard};
    overflow-y: auto;
  `,
  DrawerHeader: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.sm};
    padding: ${spacing.base};
    border-bottom: 1px solid var(--border);
  `,
  DrawerTitle: styled.h2`
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
  `,
  DrawerList: styled.div`
    display: flex;
    flex-direction: column;
    padding: ${spacing.sm};
  `,
  DrawerRow: styled.button`
    display: flex;
    align-items: center;
    gap: ${spacing.md};
    padding: ${spacing.md};
    border: none;
    border-radius: ${radius.md};
    background: transparent;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color ${motion.duration.fast} ${motion.easing.standard};

    &:hover {
      background: var(--bg-elevated);
    }
  `,
  DrawerRowText: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  `,
  DrawerRowLabel: styled.span<{ $active: boolean }>`
    font-size: 14px;
    font-weight: 600;
    color: ${({ $active }) => ($active ? 'var(--text)' : 'var(--text-muted)')};
  `,
  DrawerRowSubtitle: styled.span`
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  DrawerRowChevron: styled.span`
    flex-shrink: 0;
    color: var(--text-muted);
    font-size: 13px;
  `,
  ModalBackdrop: styled.div`
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${spacing.base};
    background: rgba(0, 0, 0, 0.5);
    animation: ${fadeIn} ${motion.duration.fast} ${motion.easing.standard};
  `,
  Modal: styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 380px;
    max-height: 80vh;
    border-radius: ${radius.lg};
    background: var(--bg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  `,
  ModalHeader: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.sm};
    padding: ${spacing.base};
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  `,
  ModalTitle: styled.h2`
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
  `,
  ModalBody: styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacing.lg};
    padding: ${spacing.base};
    overflow-y: auto;
  `,
  ModalSection: styled.div`
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  `,
  ModalSectionTitle: styled.div`
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  `,
  MasterToggleRow: styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${spacing.sm};
  `,
  MasterToggleLabel: styled.span`
    font-size: 14px;
    font-weight: 600;
  `,
  Switch: styled.button<{ $checked: boolean }>`
    position: relative;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
    border: none;
    border-radius: ${radius.pill};
    background: ${({ $checked }) => ($checked ? 'var(--accent)' : 'var(--border)')};
    cursor: pointer;
    transition: background-color ${motion.duration.fast} ${motion.easing.standard};

    &::after {
      content: '';
      position: absolute;
      top: 3px;
      left: ${({ $checked }) => ($checked ? '21px' : '3px')};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${brand.white};
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      transition: left ${motion.duration.fast} ${motion.easing.standard};
    }
  `,
  RadioGroup: styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  RadioRow: styled.label`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: 8px 4px;
    font-size: 14px;
    color: var(--text);
    cursor: pointer;

    input {
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
    }
  `,
  ChecklistGroup: styled.div`
    display: flex;
    flex-direction: column;
    max-height: 220px;
    overflow-y: auto;
  `,
  ChecklistRow: styled.label`
    display: flex;
    align-items: center;
    gap: ${spacing.sm};
    padding: 6px 4px;
    font-size: 14px;
    color: var(--text);
    cursor: pointer;

    input {
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  `,
  ChecklistEmpty: styled.div`
    font-size: 13px;
    color: var(--text-muted);
  `,
  LayerChipIcon: styled.span<{ $background: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 11px;
    color: ${brand.white};
    background: ${({ $background }) => $background};
    flex-shrink: 0;
  `,
}
