import { defineStorage } from '@aws-amplify/backend'

// First use of Amplify Storage in this app — added for Buy & Sell listing photos
// (ai/TRD.md §4.3). Only the uploader can write/delete their own listing's photos
// (path-scoped by their Cognito identity id), but any signed-in `@uga.edu` user can
// read any photo — same "public read among signed-in users, owner-only write" shape
// as MarketplaceListing itself.
export const storage = defineStorage({
  name: 'dawghubStorage',
  access: (allow) => ({
    'marketplace-photos/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
    ],
  }),
})
