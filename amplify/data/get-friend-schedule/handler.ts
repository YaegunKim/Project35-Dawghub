import type { AppSyncResolverHandler, AppSyncIdentityCognito } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

type Args = {
  friendUserId: string
}

type FriendClassEntry = {
  id: string
  courseCode: string
  title: string | null
  day: string
  startTime: string
  endTime: string
  location: string | null
  locationLat: number | null
  locationLng: number | null
}

function isCognitoIdentity(identity: unknown): identity is AppSyncIdentityCognito {
  return typeof identity === 'object' && identity !== null && 'sub' in identity
}

export const handler: AppSyncResolverHandler<Args, FriendClassEntry[]> = async (event) => {
  if (!isCognitoIdentity(event.identity)) throw new Error('Unauthenticated')
  const callerId = event.identity.sub
  const { friendUserId } = event.arguments

  // Amplify auto-populates owner-type fields (Friendship.senderId, ClassEntry's
  // implicit `owner` field) from the caller's identity, and the exact string format
  // (bare sub vs "sub::username") isn't something this handler controls or can see
  // statically — but event.identity.sub and the friendUserId the client passes in
  // (sourced from find-user-by-email's Cognito lookup) are always the bare sub. Using
  // `contains` instead of exact equality means this works correctly regardless of
  // which format Amplify's owner fields actually use.
  const friendships = await ddb.send(
    new ScanCommand({
      TableName: process.env.FRIENDSHIP_TABLE_NAME,
      FilterExpression:
        '#status = :accepted AND ' +
        '((contains(senderId, :caller) AND contains(recipientId, :friend)) OR ' +
        '(contains(senderId, :friend) AND contains(recipientId, :caller)))',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':accepted': 'ACCEPTED', ':caller': callerId, ':friend': friendUserId },
    }),
  )
  if (!friendships.Items?.length) throw new Error('Not friends with this user')

  const entries = await ddb.send(
    new ScanCommand({
      TableName: process.env.CLASS_ENTRY_TABLE_NAME,
      FilterExpression: 'contains(#owner, :friend)',
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: { ':friend': friendUserId },
    }),
  )

  return (entries.Items ?? []).map((item) => ({
    id: item.id,
    courseCode: item.courseCode,
    title: item.title ?? null,
    day: item.day,
    startTime: item.startTime,
    endTime: item.endTime,
    location: item.location ?? null,
    locationLat: item.locationLat ?? null,
    locationLng: item.locationLng ?? null,
  }))
}
