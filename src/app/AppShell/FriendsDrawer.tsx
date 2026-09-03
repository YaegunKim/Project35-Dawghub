import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserGroup, faXmark, faCheck, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import { Input } from '../../design-system/Input/Input'
import { Button } from '../../design-system/Button/Button'
import { IconButton } from '../../design-system/IconButton/IconButton'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { EmptyState } from '../../design-system/EmptyState/EmptyState'
import { useToast } from '../../design-system/Toast/Toast'
import { client } from '../../lib/amplifyClient'
import { FRIENDSHIPS_KEY } from '../../lib/queryKeys'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './FriendsDrawer.style'

type Friendship = Schema['Friendship']['type']

const CURRENT_USER_KEY = ['currentUserAttributes'] as const

export function FriendsDrawer() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data: me } = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: async () => {
      // senderId is a plain string field (allow.ownerDefinedIn, not allow.owner()) —
      // unlike an implicit `owner` field, Amplify does not auto-populate it, so it must
      // be set to exactly the identity string AppSync will later check against: sub and
      // Cognito's own Username (from getCurrentUser, not a standard user attribute).
      const [attrs, current] = await Promise.all([fetchUserAttributes(), getCurrentUser()])
      return { sub: current.userId, username: current.username, email: attrs.email ?? '' }
    },
  })

  const { data: friendships = [], isLoading } = useQuery({
    queryKey: FRIENDSHIPS_KEY,
    queryFn: async () => {
      const res = await client.models.Friendship.list()
      return res.data
    },
    enabled: open,
  })

  const mySub = me?.sub ?? ''
  const isMine = (ownerField: string) => ownerField === mySub || ownerField.startsWith(`${mySub}::`)

  function otherParty(f: Friendship) {
    return isMine(f.senderId) ? { id: f.recipientId, email: f.recipientEmail } : { id: f.senderId, email: f.senderEmail }
  }

  const accepted = useMemo(() => friendships.filter((f) => f.status === 'ACCEPTED'), [friendships])
  const incoming = useMemo(
    () => friendships.filter((f) => f.status === 'PENDING' && (f.recipientId === mySub || f.recipientId.startsWith(`${mySub}::`))),
    [friendships, mySub],
  )
  const outgoing = useMemo(
    () => friendships.filter((f) => f.status === 'PENDING' && (f.senderId === mySub || f.senderId.startsWith(`${mySub}::`))),
    [friendships, mySub],
  )

  function replaceInCache(updated: Friendship) {
    queryClient.setQueryData(FRIENDSHIPS_KEY, (old: Friendship[] | undefined) =>
      (old ?? []).map((f) => (f.id === updated.id ? updated : f)),
    )
  }

  async function respondToRequest(f: Friendship, status: 'ACCEPTED' | 'DECLINED') {
    setPendingId(f.id)
    try {
      const res = await client.models.Friendship.update({ id: f.id, status })
      if (res.errors?.length || !res.data) throw new Error('Friendship.update failed')
      replaceInCache(res.data)
    } catch {
      showToast({ message: t('friends.actionFailed'), variant: 'danger' })
    } finally {
      setPendingId(null)
    }
  }

  function handleAccept(f: Friendship) {
    return respondToRequest(f, 'ACCEPTED')
  }

  function handleDecline(f: Friendship) {
    return respondToRequest(f, 'DECLINED')
  }

  async function handleAddFriend(e: FormEvent) {
    e.preventDefault()
    const email = emailInput.trim().toLowerCase()
    if (!email || !me) return

    const alreadyConnected = friendships.some((f) => otherParty(f).email.toLowerCase() === email)
    if (alreadyConnected) {
      setAddError(t('friends.alreadyConnected'))
      return
    }

    setSubmitting(true)
    setAddError(null)
    try {
      const lookup = await client.queries.findUserByEmail({ email })
      const result = lookup.data
      if (!result?.found || !result.userId || !result.username) {
        setAddError(t('friends.notFound'))
        return
      }

      const res = await client.models.Friendship.create({
        senderId: `${me.sub}::${me.username}`,
        recipientId: `${result.userId}::${result.username}`,
        recipientEmail: email,
        senderEmail: me.email,
        status: 'PENDING',
      })
      if (!res.data) {
        setAddError(t('friends.addError'))
        return
      }
      queryClient.setQueryData(FRIENDSHIPS_KEY, (old: Friendship[] | undefined) => [...(old ?? []), res.data!])
      setEmailInput('')
    } finally {
      setSubmitting(false)
    }
  }

  function goToFriendSchedule(f: Friendship) {
    const bareId = otherParty(f).id.split('::')[0]
    setOpen(false)
    navigate(`/friends/${bareId}`)
  }

  return (
    <>
      <S.FriendsButton type="button" onClick={() => setOpen(true)} aria-label={t('friends.open')}>
        <span>{t('friends.label')}</span>
        <S.FriendsButtonIcon>
          <FontAwesomeIcon icon={faUserGroup} />
        </S.FriendsButtonIcon>
      </S.FriendsButton>

      {open && (
        <>
          <S.DrawerBackdrop onClick={() => setOpen(false)} />
          <S.Drawer>
            <S.DrawerHeader>
              <S.DrawerTitle>{t('friends.label')}</S.DrawerTitle>
              <IconButton aria-label={t('schedule.close')} onClick={() => setOpen(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </IconButton>
            </S.DrawerHeader>

            <S.DrawerScroll>
              {isLoading && (
                <S.Section>
                  <S.DrawerList>
                    <Skeleton height="48px" />
                    <Skeleton height="48px" />
                  </S.DrawerList>
                </S.Section>
              )}

              {!isLoading && incoming.length > 0 && (
                <S.Section>
                  <S.SectionTitle>{t('friends.pending')}</S.SectionTitle>
                  <S.DrawerList>
                    {incoming.map((f) => (
                      <S.PendingRow key={f.id}>
                        <S.DrawerRowText>
                          <S.DrawerRowLabel $active>{f.senderEmail}</S.DrawerRowLabel>
                          <S.DrawerRowSubtitle>{t('friends.incomingRequest')}</S.DrawerRowSubtitle>
                        </S.DrawerRowText>
                        <S.PendingActions>
                          <IconButton
                            aria-label={t('friends.accept')}
                            disabled={pendingId === f.id}
                            onClick={() => handleAccept(f)}
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </IconButton>
                          <IconButton
                            aria-label={t('friends.decline')}
                            disabled={pendingId === f.id}
                            onClick={() => handleDecline(f)}
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </IconButton>
                        </S.PendingActions>
                      </S.PendingRow>
                    ))}
                  </S.DrawerList>
                </S.Section>
              )}

              {!isLoading && outgoing.length > 0 && (
                <S.Section>
                  <S.SectionTitle>{t('friends.sentRequests')}</S.SectionTitle>
                  <S.DrawerList>
                    {outgoing.map((f) => (
                      <S.StaticRow key={f.id}>
                        <S.DrawerRowText>
                          <S.DrawerRowLabel $active={false}>{f.recipientEmail}</S.DrawerRowLabel>
                          <S.DrawerRowSubtitle>{t('friends.awaitingResponse')}</S.DrawerRowSubtitle>
                        </S.DrawerRowText>
                      </S.StaticRow>
                    ))}
                  </S.DrawerList>
                </S.Section>
              )}

              {!isLoading && (
                <S.Section>
                  <S.SectionTitle>{t('friends.myFriends')}</S.SectionTitle>
                  {accepted.length === 0 ? (
                    <EmptyState>{t('friends.empty')}</EmptyState>
                  ) : (
                    <S.DrawerList>
                      {accepted.map((f) => (
                        <S.DrawerRow key={f.id} type="button" onClick={() => goToFriendSchedule(f)}>
                          <S.DrawerRowText>
                            <S.DrawerRowLabel $active>{otherParty(f).email}</S.DrawerRowLabel>
                          </S.DrawerRowText>
                        </S.DrawerRow>
                      ))}
                    </S.DrawerList>
                  )}
                </S.Section>
              )}
            </S.DrawerScroll>

            <S.AddFriendForm onSubmit={handleAddFriend}>
              {addError && <S.AddFriendError>{addError}</S.AddFriendError>}
              <S.AddFriendRow>
                <Input
                  type="email"
                  placeholder={t('friends.addPlaceholder')}
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value)
                    if (addError) setAddError(null)
                  }}
                />
                <Button type="submit" disabled={submitting || !emailInput.trim()} aria-label={t('friends.addSubmit')}>
                  <FontAwesomeIcon icon={faUserPlus} />
                </Button>
              </S.AddFriendRow>
            </S.AddFriendForm>
          </S.Drawer>
        </>
      )}
    </>
  )
}
