import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'
import { state, surface } from '../../design-system/colors'
import { radius } from '../../design-system/radius'
import { shadow } from '../../design-system/shadow'

export const S = {
  FieldError: styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${state.danger};
  `,
  ErrorActions: styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  `,
  PostCard: styled(Card)<{ $color: string }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-radius: ${radius.lg};
    border-top: 3px solid ${({ $color }) => $color};
    box-shadow: ${shadow.card};
  `,
  PostAuthor: styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    align-self: flex-start;
    padding: 2px 9px;
    border-radius: ${radius.pill};
    background: ${({ $color }) => `${$color}1A`};
    font-size: 11px;
    font-weight: 700;
    color: ${({ $color }) => $color};
  `,
  PostTitle: styled.h1`
    font-size: 18px;
    margin: 0;
    font-family: var(--font-display);
  `,
  LikeButton: styled.button<{ $active: boolean }>`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid ${(props) => (props.$active ? state.danger : surface.border)};
    background: ${(props) => (props.$active ? `${state.danger}14` : 'none')};
    color: ${(props) => (props.$active ? state.danger : surface.text)};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease;

    &:active {
      transform: scale(0.94);
    }
  `,
  PostBody: styled.p`
    font-size: 14px;
    color: ${surface.textMuted};
    margin: 0;
    white-space: pre-wrap;
  `,
  CommentSection: styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  CommentHeading: styled.h2`
    font-size: 15px;
    margin: 0;
    font-family: var(--font-display);
  `,
  Form: styled.form`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  CommentList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  CommentCard: styled(Card)<{ $color: string }>`
    display: flex;
    flex-direction: column;
    gap: 3px;
    border: none;
    border-left: 3px solid ${({ $color }) => $color};
    border-radius: ${radius.md};
    padding: 10px 14px;
    background: ${surface.bgElevated};
    box-shadow: ${shadow.sm};
  `,
  CommentAuthor: styled.span<{ $color: string }>`
    font-size: 11px;
    font-weight: 700;
    color: ${({ $color }) => $color};
  `,
  CommentBody: styled.p`
    margin: 0;
    font-size: 14px;
    white-space: pre-wrap;
  `,
}
