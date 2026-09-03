import styled from '@emotion/styled'
import { Card, CardLink } from '../../design-system/Card/Card'
import { state } from '../../design-system/colors'

export const S = {
  SkeletonCard: styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  Form: styled.form`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
  `,
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
  PostList: styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,
  PostCard: styled(CardLink)`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  PostTitle: styled.h2`
    font-size: 15px;
    margin: 0;
  `,
  PostBody: styled.p`
    font-size: 14px;
    color: var(--text-muted);
    margin: 0;
    white-space: pre-wrap;
  `,
}
