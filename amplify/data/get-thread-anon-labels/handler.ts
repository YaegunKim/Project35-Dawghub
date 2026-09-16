import type { AppSyncResolverHandler } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

type Args = {
  postId: string
}

type ThreadAnonLabel = {
  commentId: string
  anonNumber: number
}

type Result = {
  labels: ThreadAnonLabel[]
}

// Assigns each distinct commenter on a post a stable per-thread ordinal (1st distinct
// commenter -> 1, 2nd -> 2, ...), in order of first appearance — the Everytime "익명1/익명2"
// mental model (see ai/PRD.md §6.1, ai/TRD.md §4.5). This can't be computed client-side:
// a client only ever sees `owner` on rows it's authorized to read, which tells it nothing
// about whether two different rows share an owner across other users' comments. Instead this
// Lambda gets a scoped direct read grant on the Comment table (backend.ts) and computes the
// mapping fresh on every call — recomputing from `owner` order is deliberately preferred over
// storing a number at write time, so the raw `owner` identity string never has to be echoed
// back to any client (only the derived ordinal is returned).
export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { postId } = event.arguments

  const result = await ddb.send(
    new ScanCommand({
      TableName: process.env.COMMENT_TABLE_NAME,
      FilterExpression: 'postId = :postId',
      ExpressionAttributeValues: { ':postId': postId },
    }),
  )

  const items = (result.Items ?? []).sort((a, b) => {
    const aTime = typeof a.createdAt === 'string' ? a.createdAt : ''
    const bTime = typeof b.createdAt === 'string' ? b.createdAt : ''
    return aTime.localeCompare(bTime)
  })

  const numberByOwner = new Map<string, number>()
  const labels: ThreadAnonLabel[] = []
  for (const item of items) {
    const owner = typeof item.owner === 'string' ? item.owner : ''
    if (!numberByOwner.has(owner)) numberByOwner.set(owner, numberByOwner.size + 1)
    labels.push({ commentId: item.id, anonNumber: numberByOwner.get(owner)! })
  }

  return { labels }
}
