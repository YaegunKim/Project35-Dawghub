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
import { useToast } from '../../design-system/Toast/Toast'
import { client } from '../../lib/amplifyClient'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './PostDetailPage.style'

type Comment = Schema['Comment']['type']

export function PostDetailPage() {
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    data: post,
    isLoading: postLoading,
    isError: postIsError,
    refetch: refetchPost,
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data } = await client.models.Post.get({ id: postId! })
      return data
    },
    enabled: !!postId,
  })

  const {
    data: comments = [],
    isLoading: commentsLoading,
    isError: commentsIsError,
    refetch: refetchComments,
  } = useQuery({
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
    if (!postId) return
    if (!body.trim()) {
      setValidationError(true)
      return
    }
    setValidationError(false)
    setSubmitting(true)
    try {
      const { data, errors } = await client.models.Comment.create({ postId, body })
      if (errors?.length || !data) throw new Error('Comment.create failed')
      queryClient.setQueryData<Comment[]>(['comments', postId], (prev) => [...(prev ?? []), data])
      setBody('')
    } catch {
      showToast({ message: t('community.commentFailed'), variant: 'danger' })
    } finally {
      setSubmitting(false)
    }
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

  if (postIsError) {
    return (
      <Page>
        <BackLink to={`/community/${boardId}`}>{t('community.back')}</BackLink>
        <S.ErrorActions>
          <EmptyState>{t('community.loadErrorPost')}</EmptyState>
          <Button size="sm" variant="secondary" onClick={() => refetchPost()}>
            {t('community.retry')}
          </Button>
        </S.ErrorActions>
      </Page>
    )
  }

  if (!post) {
    return (
      <Page>
        <BackLink to={`/community/${boardId}`}>{t('community.back')}</BackLink>
        <EmptyState>{t('community.notFound')}</EmptyState>
      </Page>
    )
  }

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
          {validationError && <S.FieldError>{t('community.commentValidation')}</S.FieldError>}
          <Button type="submit" loading={submitting}>
            {t('community.commentSubmit')}
          </Button>
        </S.Form>

        {commentsIsError ? (
          <S.ErrorActions>
            <EmptyState>{t('community.loadError')}</EmptyState>
            <Button size="sm" variant="secondary" onClick={() => refetchComments()}>
              {t('community.retry')}
            </Button>
          </S.ErrorActions>
        ) : comments.length === 0 ? (
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
