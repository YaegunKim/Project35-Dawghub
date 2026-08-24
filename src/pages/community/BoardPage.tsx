import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../design-system/Button/Button'
import { Input } from '../../design-system/Input/Input'
import { Textarea } from '../../design-system/Textarea/Textarea'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { client } from '../../lib/amplifyClient'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './BoardPage.style'

type Post = Schema['Post']['type']

const BOARD_ENUM_MAP = {
  general: 'GENERAL',
  housing: 'HOUSING',
  classes: 'CLASSES',
  buySell: 'BUY_SELL',
  events: 'EVENTS',
} as const

type BoardId = keyof typeof BOARD_ENUM_MAP

function isBoardId(value: string | undefined): value is BoardId {
  return !!value && value in BOARD_ENUM_MAP
}

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const validBoard = isBoardId(boardId)
  const boardValue = validBoard ? BOARD_ENUM_MAP[boardId] : undefined

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', boardValue],
    queryFn: async () => {
      const { data } = await client.models.Post.list({ filter: { board: { eq: boardValue! } } })
      return data
    },
    enabled: !!boardValue,
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!boardValue || !title.trim() || !body.trim()) return

    const { data } = await client.models.Post.create({ board: boardValue, title, body })
    if (data) {
      queryClient.setQueryData<Post[]>(['posts', boardValue], (prev) => [data, ...(prev ?? [])])
    }
    setTitle('')
    setBody('')
  }

  if (!validBoard) return null

  return (
    <Page>
      <BackLink to="/community">{t('community.back')}</BackLink>
      <PageTitle>{t(`community.boards.${boardId}`)}</PageTitle>

      <S.Form onSubmit={handleSubmit}>
        <Input
          placeholder={t('community.titlePlaceholder')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          placeholder={t('community.bodyPlaceholder')}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button type="submit">{t('community.post')}</Button>
      </S.Form>

      {isLoading ? (
        <S.PostList>
          {[0, 1, 2].map((i) => (
            <S.SkeletonCard key={i}>
              <Skeleton height="15px" width="55%" />
              <Skeleton height="14px" width="90%" />
            </S.SkeletonCard>
          ))}
        </S.PostList>
      ) : posts.length === 0 ? (
        <EmptyState>{t('community.empty')}</EmptyState>
      ) : (
        <S.PostList>
          {posts.map((post) => (
            <S.PostCard key={post.id} to={`/community/${boardId}/${post.id}`}>
              <S.PostTitle>{post.title}</S.PostTitle>
              <S.PostBody>{post.body}</S.PostBody>
            </S.PostCard>
          ))}
        </S.PostList>
      )}
    </Page>
  )
}
