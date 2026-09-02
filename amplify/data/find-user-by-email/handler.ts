import type { AppSyncResolverHandler } from 'aws-lambda'
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'

const cognito = new CognitoIdentityProviderClient({})

// Set via .addEnvironment(...) in amplify/backend.ts, alongside the ListUsers grant
// (see that file for why this isn't done through defineAuth's `access` builder).
const USERPOOL_ID = process.env.USERPOOL_ID!

type Args = {
  email: string
}

type Result = {
  found: boolean
  userId: string | null
  username: string | null
  email: string | null
}

const NOT_FOUND: Result = { found: false, userId: null, username: null, email: null }

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const email = event.arguments.email.trim().toLowerCase()
  if (!email.endsWith('@uga.edu')) return NOT_FOUND

  const result = await cognito.send(
    new ListUsersCommand({
      UserPoolId: USERPOOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    }),
  )

  const user = result.Users?.[0]
  if (!user) return NOT_FOUND

  const sub = user.Attributes?.find((attr) => attr.Name === 'sub')?.Value ?? null
  if (!sub) return NOT_FOUND

  return { found: true, userId: sub, username: user.Username ?? null, email }
}
