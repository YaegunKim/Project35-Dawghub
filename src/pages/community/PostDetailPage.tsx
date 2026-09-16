import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { faHeart } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../design-system/Button/Button'
import { Textarea } from '../../design-system/Textarea/Textarea'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { Page } from '../../design-system/Page/Page'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { useToast } from '../../design-system/Toast/Toast'
import { client } from '../../lib/amplifyClient'
import { getLikeCount, isLikedByMe, toggleLike } from '../../lib/postLikes'
import { category, brand, surface } from '../../design-system/colors'
import { CommunityEmptyState } from './CommunityEmptyState'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './PostDetailPage.style'

type Comment = Schema['Comment']['type']

function anonColor(anonNumber: number): string {
  return category.courses[(anonNumber - 1) % category.courses.length]
}

export function PostDetailPage() {
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { data: like } = useQuery({
    queryKey: ['postLike', postId],
    queryFn: async () => ({ liked: await isLikedByMe(postId!), count: await getLikeCount(postId!) }),
    enabled: !!postId,
  })

  // Everytime-style per-thread anonymous numbering (ai/SPEC.md §1.2) — computed
  // server-side (see amplify/data/get-thread-anon-labels) since a client only ever
  // sees `owner` on its own rows, never enough to distinguish commenters across a
  // whole thread. The post author itself is always shown as plain "Anonymous", no
  // number — there's only one author per post.
  const { data: anonLabels } = useQuery({
    queryKey: ['threadAnonLabels', postId],
    queryFn: async () => {
      const { data } = await client.queries.getThreadAnonLabels({ postId: postId! })
      return data?.labels ?? []
    },
    enabled: !!postId,
  })

  function anonLabelFor(commentId: string): { label: string; color: string } {
    const found = anonLabels?.find((label) => label?.commentId === commentId)
    if (found?.anonNumber) {
      return { label: t('community.general.anonymousNumbered', { number: found.anonNumber }), color: anonColor(found.anonNumber) }
    }
    return { label: t('community.general.anonymousAuthor'), color: category.community.general }
  }

  async function handleToggleLike() {
    if (!postId) return
    const previous = like ?? { liked: false, count: 0 }
    queryClient.setQueryData(['postLike', postId], {
      liked: !previous.liked,
      count: previous.count + (previous.liked ? -1 : 1),
    })
    try {
      await toggleLike(postId)
    } catch {
      queryClient.setQueryData(['postLike', postId], previous)
      showToast({ message: t('community.general.likeFailed'), variant: 'danger' })
    }
  }

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
        <S.PostCard $color={surface.border}>
          <Skeleton height="18px" width="70%" />
          <Skeleton height="14px" width="100%" />
          <Skeleton height="14px" width="85%" />
        </S.PostCard>
        <S.CommentList>
          {[0, 1].map((i) => (
            <S.CommentCard key={i} $color={surface.border}>
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
        <CommunityEmptyState
          message={t('community.loadErrorPost')}
          action={{ label: t('community.retry'), onClick: () => refetchPost() }}
        />
      </Page>
    )
  }

  if (!post) {
    return (
      <Page>
        <BackLink to={`/community/${boardId}`}>{t('community.back')}</BackLink>
        <CommunityEmptyState message={t('community.notFound')} />
      </Page>
    )
  }

  const boardColor = category.community[boardId as keyof typeof category.community] ?? brand.primary

  return (
    <Page>
      <BackLink to={`/community/${boardId}`}>{t('community.back')}</BackLink>

      <S.PostCard $color={boardColor}>
        <S.PostAuthor $color={category.community.general}>{t('community.general.anonymousAuthor')}</S.PostAuthor>
        <S.PostTitle>{post.title}</S.PostTitle>
        <S.PostBody>{post.body}</S.PostBody>
        <S.LikeButton type="button" $active={!!like?.liked} onClick={handleToggleLike}>
          <FontAwesomeIcon icon={faHeart} />
          {t('community.general.like')} {like ? `(${like.count})` : ''}
        </S.LikeButton>
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
          <CommunityEmptyState
            message={t('community.loadError')}
            action={{ label: t('community.retry'), onClick: () => refetchComments() }}
          />
        ) : comments.length === 0 ? (
          <CommunityEmptyState message={t('community.noComments')} />
        ) : (
          <S.CommentList>
            {comments.map((comment) => {
              const { label, color } = anonLabelFor(comment.id)
              return (
                <S.CommentCard key={comment.id} $color={color}>
                  <S.CommentAuthor $color={color}>{label}</S.CommentAuthor>
                  <S.CommentBody>{comment.body}</S.CommentBody>
                </S.CommentCard>
              )
            })}
          </S.CommentList>
        )}
      </S.CommentSection>
    </Page>
  )
}
