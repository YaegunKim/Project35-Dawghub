import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchUserAttributes } from 'aws-amplify/auth'
import {
  faTag,
  faBook,
  faCouch,
  faLaptop,
  faShirt,
  faTicket,
  faCartShopping,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../design-system/Button/Button'
import { Input } from '../../design-system/Input/Input'
import { Textarea } from '../../design-system/Textarea/Textarea'
import { Select } from '../../design-system/Select/Select'
import { BackLink } from '../../design-system/BackLink/BackLink'
import { Page, PageTitle } from '../../design-system/Page/Page'
import { Skeleton } from '../../design-system/Skeleton/Skeleton'
import { useToast } from '../../design-system/Toast/Toast'
import { client } from '../../lib/amplifyClient'
import { deleteListingPhoto, resolveListingPhotoUrl, uploadListingPhoto } from '../../lib/marketplacePhotos'
import { category } from '../../design-system/colors'
import { CommunityEmptyState } from './CommunityEmptyState'
import type { Schema } from '../../../amplify/data/resource'
import { S } from './BuySellBoardPage.style'

type MarketplaceListing = Schema['MarketplaceListing']['type']

const CATEGORIES = ['TEXTBOOKS', 'FURNITURE', 'ELECTRONICS', 'CLOTHING', 'TICKETS', 'OTHER'] as const
const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const
const MAX_PHOTOS = 6
const BOARD_COLOR = category.community.buySell

const CATEGORY_ICONS = {
  TEXTBOOKS: faBook,
  FURNITURE: faCouch,
  ELECTRONICS: faLaptop,
  CLOTHING: faShirt,
  TICKETS: faTicket,
  OTHER: faTag,
} as const

function toCategoryKey(value: string): string {
  return value.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function categoryColor(value: string | null | undefined): string {
  const key = value ? toCategoryKey(value) : 'other'
  return (category.marketplace as Record<string, string>)[key] ?? category.marketplace.other
}

function ListingThumbnail({ photoKey, listingCategory }: { photoKey: string | undefined | null; listingCategory: string | null | undefined }) {
  const { data: url } = useQuery({
    queryKey: ['listingPhotoUrl', photoKey],
    queryFn: () => resolveListingPhotoUrl(photoKey!),
    enabled: !!photoKey,
    staleTime: 55 * 60 * 1000, // S3 presigned URLs are valid ~1 hour; avoid re-resolving every render
  })
  const color = categoryColor(listingCategory)
  const icon = CATEGORY_ICONS[(listingCategory as keyof typeof CATEGORY_ICONS) ?? 'OTHER'] ?? faTag

  return (
    <S.ListingPhoto $color={url ? undefined : color}>
      {url ? <img src={url} alt="" /> : <FontAwesomeIcon icon={icon} />}
    </S.ListingPhoto>
  )
}

export function BuySellBoardPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [listingCategory, setListingCategory] = useState<(typeof CATEGORIES)[number]>('OTHER')
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>('GOOD')
  const [photos, setPhotos] = useState<File[]>([])
  const [validationError, setValidationError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [showSold, setShowSold] = useState(false)

  const {
    data: listings = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['marketplaceListings'],
    queryFn: async () => {
      const { data } = await client.models.MarketplaceListing.list()
      return data
    },
  })

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setPhotos((prev) => [...prev, ...files].slice(0, MAX_PHOTOS))
    event.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const priceValue = parseFloat(price)
    if (!title.trim() || !description.trim() || !Number.isFinite(priceValue) || priceValue <= 0) {
      setValidationError(true)
      return
    }
    setValidationError(false)
    setSubmitting(true)

    const listingId = crypto.randomUUID()
    const uploadedKeys: string[] = []
    try {
      const attrs = await fetchUserAttributes()
      for (const photo of photos) {
        uploadedKeys.push(await uploadListingPhoto(photo, listingId))
      }

      // Photos + the record are only made visible together — if any upload above
      // failed, we never reach this create call, so no half-populated listing is
      // ever shown (ai/SPEC.md §4.2).
      const { data, errors } = await client.models.MarketplaceListing.create({
        id: listingId,
        title,
        description,
        price: priceValue,
        category: listingCategory,
        condition,
        status: 'ACTIVE',
        photoKeys: uploadedKeys,
        sellerEmail: attrs.email ?? '',
      })
      if (errors?.length || !data) throw new Error('MarketplaceListing.create failed')

      queryClient.setQueryData<MarketplaceListing[]>(['marketplaceListings'], (prev) => [data, ...(prev ?? [])])
      setTitle('')
      setDescription('')
      setPrice('')
      setListingCategory('OTHER')
      setCondition('GOOD')
      setPhotos([])
    } catch {
      await Promise.allSettled(uploadedKeys.map((key) => deleteListingPhoto(key)))
      showToast({ message: t(photos.length ? 'community.buySell.uploadFailed' : 'community.buySell.createFailed'), variant: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const visibleListings = listings.filter((listing) => {
    if (!showSold && listing.status === 'SOLD') return false
    if (categoryFilter !== 'ALL' && listing.category !== categoryFilter) return false
    return true
  })

  return (
    <Page>
      <BackLink to="/community">{t('community.back')}</BackLink>
      <S.TitleRow>
        <S.TitleIconBadge $color={BOARD_COLOR}>
          <FontAwesomeIcon icon={faCartShopping} />
        </S.TitleIconBadge>
        <PageTitle>{t('community.boards.buySell')}</PageTitle>
      </S.TitleRow>

      <S.Form onSubmit={handleSubmit} $color={BOARD_COLOR}>
        <S.FormHeading>
          <FontAwesomeIcon icon={faPlus} />
          {t('community.buySell.createListing')}
        </S.FormHeading>
        <Input
          placeholder={t('community.buySell.titlePlaceholder')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          placeholder={t('community.buySell.descriptionPlaceholder')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <S.FieldRow>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={t('community.buySell.priceLabel')}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <Select value={listingCategory} onChange={(event) => setListingCategory(event.target.value as typeof listingCategory)}>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`community.buySell.category.${toCategoryKey(value)}`)}
              </option>
            ))}
          </Select>
          <Select value={condition} onChange={(event) => setCondition(event.target.value as typeof condition)}>
            {CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {t(`community.buySell.condition.${toCategoryKey(value)}`)}
              </option>
            ))}
          </Select>
        </S.FieldRow>

        <S.PhotoRow>
          {photos.map((file, index) => (
            <S.PhotoThumb key={`${file.name}-${index}`}>
              <img src={URL.createObjectURL(file)} alt="" />
              <S.RemovePhotoButton type="button" onClick={() => removePhoto(index)} aria-label={t('schedule.close')}>
                ×
              </S.RemovePhotoButton>
            </S.PhotoThumb>
          ))}
          {photos.length < MAX_PHOTOS && (
            <S.AddPhotoButton $color={BOARD_COLOR}>
              <FontAwesomeIcon icon={faPlus} />
              {t('community.buySell.addPhoto')}
              <input type="file" accept="image/*" multiple onChange={handlePhotoChange} />
            </S.AddPhotoButton>
          )}
        </S.PhotoRow>

        {validationError && <S.FieldError>{t('community.buySell.validation')}</S.FieldError>}
        <Button type="submit" loading={submitting}>
          {t('community.buySell.createListing')}
        </Button>
      </S.Form>

      <S.ChipRow>
        {(['ALL', ...CATEGORIES] as const).map((value) => (
          <S.Chip
            key={value}
            type="button"
            $active={categoryFilter === value}
            $color={value === 'ALL' ? BOARD_COLOR : categoryColor(value)}
            onClick={() => setCategoryFilter(value)}
          >
            {value !== 'ALL' && <FontAwesomeIcon icon={CATEGORY_ICONS[value]} />}
            {t(`community.buySell.category.${toCategoryKey(value)}`)}
          </S.Chip>
        ))}
      </S.ChipRow>
      <S.ToggleRow>
        <input type="checkbox" checked={showSold} onChange={(event) => setShowSold(event.target.checked)} />
        {t('community.buySell.showSold')}
      </S.ToggleRow>

      {isLoading ? (
        <S.Grid>
          {[0, 1, 2].map((i) => (
            <S.SkeletonCard key={i}>
              <Skeleton height="120px" />
              <Skeleton height="14px" width="70%" />
            </S.SkeletonCard>
          ))}
        </S.Grid>
      ) : isError ? (
        <CommunityEmptyState
          message={t('community.loadError')}
          action={{ label: t('community.retry'), onClick: () => refetch() }}
        />
      ) : visibleListings.length === 0 ? (
        <CommunityEmptyState message={t('community.buySell.empty')} />
      ) : (
        <S.Grid>
          {visibleListings.map((listing: MarketplaceListing) => (
            <S.ListingCard key={listing.id} to={`/community/buySell/${listing.id}`} $color={categoryColor(listing.category)}>
              <S.PhotoWrap>
                <ListingThumbnail photoKey={listing.photoKeys?.[0]} listingCategory={listing.category} />
                {listing.status === 'SOLD' && <S.SoldRibbon>{t('community.buySell.status.sold')}</S.SoldRibbon>}
                {listing.status === 'RESERVED' && <S.ReservedRibbon>{t('community.buySell.status.reserved')}</S.ReservedRibbon>}
              </S.PhotoWrap>
              <S.ListingTitle>{listing.title}</S.ListingTitle>
              <S.ListingPrice>${listing.price?.toFixed(2)}</S.ListingPrice>
              {listing.category && (
                <S.ListingMeta $color={categoryColor(listing.category)}>
                  <FontAwesomeIcon icon={CATEGORY_ICONS[listing.category as keyof typeof CATEGORY_ICONS] ?? faTag} />
                  {t(`community.buySell.category.${toCategoryKey(listing.category)}`)}
                </S.ListingMeta>
              )}
            </S.ListingCard>
          ))}
        </S.Grid>
      )}
    </Page>
  )
}
