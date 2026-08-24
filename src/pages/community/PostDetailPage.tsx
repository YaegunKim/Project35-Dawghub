import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../design-system/Button/Button'
import { Textarea } from '../../design-system/Textarea/Textarea'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { Page } from '../../design-system/Page/Page'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { client } from '../../lib/amplifyClient'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './PostDetailPage.style'

type Comment = Schema['Comment']['type']

export function PostDetailPage() {
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data } = await client.models.Post.get({ id: postId! })
      return data
    },
    enabled: !!postId,
  })

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data } = await client.models.Comment.list({ filter: { postId: { eq: postId! } } })
      return data
    },
    enabled: !!postId,
  })

  const loading = postLoading || commentsLoading

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!postId || !body.trim()) return

    const { data } = await client.models.Comment.create({ postId, body })
    if (data) {
      queryClient.setQueryData<Comment[]>(['comments', postId], (prev) => [...(prev ?? []), data])
    }
    setBody('')
  }

  if (loading) {
    return (
      <Page>
        <BackLink to={`/community/${boardId}`}>{t('community.back')}</BackLink>
        <S.PostCard>
          <Skeleton height="18px" width="70%" />
          <Skeleton height="14px" width="100%" />
          <Skeleton height="14px" width="85%" />
        </S.PostCard>
        <S.CommentList>
          {[0, 1].map((i) => (
            <S.CommentCard key={i}>
              <Skeleton height="14px" width="90%" />
            </S.CommentCard>
          ))}
        </S.CommentList>
      </Page>
    )
  }
  if (!post) return null

  return (
    <Page>
      <BackLink to={`/community/${boardId}`}>{t('community.back')}</BackLink>

      <S.PostCard>
        <S.PostTitle>{post.title}</S.PostTitle>
        <S.PostBody>{post.body}</S.PostBody>
      </S.PostCard>

      <S.CommentSection>
        <S.CommentHeading>
          {t('community.comments')} ({comments.length})
        </S.CommentHeading>

        <S.Form onSubmit={handleSubmit}>
          <Textarea
            placeholder={t('community.commentPlaceholder')}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <Button type="submit">{t('community.commentSubmit')}</Button>
        </S.Form>

        {comments.length === 0 ? (
          <EmptyState>{t('community.noComments')}</EmptyState>
        ) : (
          <S.CommentList>
            {comments.map((comment) => (
              <S.CommentCard key={comment.id}>{comment.body}</S.CommentCard>
            ))}
          </S.CommentList>
        )}
      </S.CommentSection>
    </Page>
  )
}
