import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getCurrentUser } from 'aws-amplify/auth'
import { faBook, faCouch, faLaptop, faShirt, faTicket, faTag, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../design-system/Button/Button'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { Page } from '../../design-system/Page/Page'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { useToast } from '../../design-system/Toast/Toast'
import { client } from '../../lib/amplifyClient'
import { resolveListingPhotoUrl } from '../../lib/marketplacePhotos'
import { category } from '../../design-system/colors'
import { CommunityEmptyState } from './CommunityEmptyState'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './BuySellDetailPage.style'

type MarketplaceListing = Schema['MarketplaceListing']['type']
type Status = MarketplaceListing['status']

const CATEGORY_ICONS = {
  TEXTBOOKS: faBook,
  FURNITURE: faCouch,
  ELECTRONICS: faLaptop,
  CLOTHING: faShirt,
  TICKETS: faTicket,
  OTHER: faTag,
} as const

const STATUS_COLOR: Record<string, string> = { ACTIVE: '#16a34a', RESERVED: '#d97706', SOLD: '#6b7280' }

function toCategoryKey(value: string): string {
  return value.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function categoryColor(value: string | null | undefined): string {
  const key = value ? toCategoryKey(value) : 'other'
  return (category.marketplace as Record<string, string>)[key] ?? category.marketplace.other
}

function isMine(owner: string | null | undefined, mySub: string | undefined): boolean {
  return !!owner && !!mySub && (owner === mySub || owner.startsWith(`${mySub}::`))
}

export function BuySellDetailPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [contactRevealed, setContactRevealed] = useState(false)

  const {
    data: listing,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['marketplaceListing', listingId],
    queryFn: async () => {
      const { data } = await client.models.MarketplaceListing.get({ id: listingId! })
      return data
    },
    enabled: !!listingId,
  })

  const { data: mySub } = useQuery({
    queryKey: ['currentUserSub'],
    queryFn: async () => (await getCurrentUser()).userId,
    staleTime: Infinity,
  })

  const { data: photoUrls = [] } = useQuery({
    queryKey: ['listingPhotoUrls', listing?.photoKeys],
    queryFn: async () => Promise.all((listing?.photoKeys ?? []).filter((key): key is string => !!key).map(resolveListingPhotoUrl)),
    enabled: !!listing?.photoKeys?.length,
  })

  async function updateStatus(status: Status) {
    if (!listing) return
    try {
      await client.models.MarketplaceListing.update({ id: listing.id, status })
      queryClient.setQueryData(['marketplaceListing', listingId], { ...listing, status })
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] })
    } catch {
      showToast({ message: t('community.buySell.updateFailed'), variant: 'danger' })
    }
  }

  async function handleDelete() {
    if (!listing) return
    const snapshot = listing
    try {
      await client.models.MarketplaceListing.delete({ id: listing.id })
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] })
      navigate('/community/buySell')
      showToast({
        message: t('community.buySell.deleteListing'),
        actionLabel: t('community.buySell.undoDelete'),
        onAction: async () => {
          try {
            await client.models.MarketplaceListing.create(snapshot)
            queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] })
          } catch {
            showToast({ message: t('community.buySell.createFailed'), variant: 'danger' })
          }
        },
      })
    } catch {
      showToast({ message: t('community.buySell.deleteFailed'), variant: 'danger' })
    }
  }

  if (isLoading) {
    return (
      <Page>
        <BackLink to="/community/buySell">{t('community.back')}</BackLink>
        <S.DetailCard $color={category.community.buySell}>
          <Skeleton height="200px" />
          <Skeleton height="18px" width="60%" />
        </S.DetailCard>
      </Page>
    )
  }

  if (isError) {
    return (
      <Page>
        <BackLink to="/community/buySell">{t('community.back')}</BackLink>
        <CommunityEmptyState
          message={t('community.loadErrorPost')}
          action={{ label: t('community.retry'), onClick: () => refetch() }}
        />
      </Page>
    )
  }

  if (!listing) {
    return (
      <Page>
        <BackLink to="/community/buySell">{t('community.back')}</BackLink>
        <CommunityEmptyState message={t('community.notFound')} />
      </Page>
    )
  }

  const owner = isMine((listing as unknown as { owner?: string }).owner, mySub)

  return (
    <Page>
      <BackLink to="/community/buySell">{t('community.back')}</BackLink>

      <S.DetailCard $color={categoryColor(listing.category)}>
        {photoUrls.length > 0 ? (
          <S.PhotoStrip>
            {photoUrls.map((url) => (
              <img key={url} src={url} alt="" />
            ))}
          </S.PhotoStrip>
        ) : (
          <S.NoPhoto $color={categoryColor(listing.category)}>
            <FontAwesomeIcon icon={CATEGORY_ICONS[listing.category as keyof typeof CATEGORY_ICONS] ?? faTag} />
          </S.NoPhoto>
        )}
        <S.Title>{listing.title}</S.Title>
        <S.Price>${listing.price?.toFixed(2)}</S.Price>
        <S.MetaRow>
          {listing.category && (
            <S.MetaChip $color={categoryColor(listing.category)}>
              <FontAwesomeIcon icon={CATEGORY_ICONS[listing.category as keyof typeof CATEGORY_ICONS] ?? faTag} />
              {t(`community.buySell.category.${toCategoryKey(listing.category)}`)}
            </S.MetaChip>
          )}
          {listing.condition && <S.MetaChip>{t(`community.buySell.condition.${toCategoryKey(listing.condition)}`)}</S.MetaChip>}
          {listing.status && (
            <S.MetaChip $color={STATUS_COLOR[listing.status]}>
              {t(`community.buySell.status.${toCategoryKey(listing.status)}`)}
            </S.MetaChip>
          )}
        </S.MetaRow>
        <S.Description>{listing.description}</S.Description>

        {owner ? (
          <S.ActionRow>
            {listing.status !== 'ACTIVE' && (
              <Button size="sm" variant="secondary" onClick={() => updateStatus('ACTIVE')}>
                {t('community.buySell.markActive')}
              </Button>
            )}
            {listing.status !== 'RESERVED' && (
              <Button size="sm" variant="secondary" onClick={() => updateStatus('RESERVED')}>
                {t('community.buySell.markReserved')}
              </Button>
            )}
            {listing.status !== 'SOLD' && (
              <Button size="sm" variant="secondary" onClick={() => updateStatus('SOLD')}>
                {t('community.buySell.markSold')}
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={handleDelete}>
              {t('community.buySell.deleteListing')}
            </Button>
          </S.ActionRow>
        ) : (
          <S.ActionRow>
            {!contactRevealed ? (
              <Button size="sm" onClick={() => setContactRevealed(true)}>
                <FontAwesomeIcon icon={faEnvelope} /> {t('community.buySell.contactSeller')}
              </Button>
            ) : (
              <S.ContactReveal>
                <FontAwesomeIcon icon={faEnvelope} />
                <span>
                  {t('community.buySell.contactRevealed')}{' '}
                  <a href={`mailto:${listing.sellerEmail}?subject=${encodeURIComponent(listing.title)}`}>{listing.sellerEmail}</a>
                </span>
              </S.ContactReveal>
            )}
          </S.ActionRow>
        )}
      </S.DetailCard>
    </Page>
  )
}
