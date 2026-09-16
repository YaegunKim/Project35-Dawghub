import { getCurrentUser } from 'aws-amplify/auth'
import { client } from './amplifyClient'

// PostLike.id is set deterministically to `${postId}_${sub}` at creation time (see
// amplify/data/resource.ts) purely so liking is idempotent — create-if-absent,
// delete-to-unlike — without a separate lookup index just to check "did I already
// like this." likeCount is not a maintained aggregate; General's like button is a
// lightweight signal, not a high-traffic counter (ai/TRD.md §4.1).
async function likeId(postId: string): Promise<string> {
  const { userId } = await getCurrentUser()
  return `${postId}_${userId}`
}

export async function isLikedByMe(postId: string): Promise<boolean> {
  const id = await likeId(postId)
  const { data } = await client.models.PostLike.get({ id })
  return !!data
}

// Returns the new liked state (true = now liked, false = now unliked).
export async function toggleLike(postId: string): Promise<boolean> {
  const id = await likeId(postId)
  const { data: existing } = await client.models.PostLike.get({ id })
  if (existing) {
    await client.models.PostLike.delete({ id })
    return false
  }
  await client.models.PostLike.create({ id, postId })
  return true
}

export async function getLikeCount(postId: string): Promise<number> {
  const { data } = await client.models.PostLike.list({ filter: { postId: { eq: postId } } })
  return data.length
}
