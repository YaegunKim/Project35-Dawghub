import { uploadData, getUrl, remove } from 'aws-amplify/storage'

// Buy & Sell listing photos (ai/TRD.md §4.3) — the first feature in this app to use
// Amplify Storage. Photos are downscaled client-side before upload since a phone photo
// can easily be 10+ MB and a marketplace card only ever displays it small.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.85

async function downscaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/jpeg', JPEG_QUALITY)
  })
}

// Uploads under marketplace-photos/{my identity id}/{listingId}/{random}.jpg — matches
// the storage access rule in amplify/storage/resource.ts (only the uploader can write to
// their own identity-scoped prefix; any signed-in user can read any photo). Returns the
// resolved S3 key to store in MarketplaceListing.photoKeys, not a URL — URLs are resolved
// on read via resolveListingPhotoUrl, since a stored public URL could expire/rotate.
export async function uploadListingPhoto(file: File, listingId: string): Promise<string> {
  const resized = await downscaleImage(file)
  const filename = `${crypto.randomUUID()}.jpg`
  const result = await uploadData({
    path: ({ identityId }) => `marketplace-photos/${identityId}/${listingId}/${filename}`,
    data: resized,
    options: { contentType: 'image/jpeg' },
  }).result
  return result.path
}

export async function resolveListingPhotoUrl(photoKey: string): Promise<string> {
  const { url } = await getUrl({ path: photoKey })
  return url.toString()
}

export async function deleteListingPhoto(photoKey: string): Promise<void> {
  await remove({ path: photoKey })
}
