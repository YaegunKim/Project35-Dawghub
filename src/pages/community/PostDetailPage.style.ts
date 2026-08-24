import styled from '@emotion/styled'
import { Card } from '../../design-system/Card/Card'

export const S = {
  PostCard: styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  PostTitle: styled.h1`
    font-size: 18px;
    margin: 0;
  `,
  PostBody: styled.p`
    font-size: 14px;
    color: var(--text-muted);
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
  CommentCard: styled(Card)`
    border: none;
    border-radius: 10px;
    padding: 10px 14px;
    background: var(--bg-elevated);
    font-size: 14px;
    white-space: pre-wrap;
  `,
}
