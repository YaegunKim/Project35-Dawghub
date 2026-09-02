import { defineFunction } from '@aws-amplify/backend'

export const findUserByEmailFn = defineFunction({
  name: 'find-user-by-email',
  timeoutSeconds: 10,
  // Referenced by both the auth stack (the `access` grant in auth/resource.ts) and
  // the data stack (as this query's resolver) — left in its default stack, those two
  // references form a circular dependency between the auth/data/function nested
  // stacks. Pinning it to the data stack (where it functionally belongs, as a query
  // resolver) breaks the cycle, per Amplify's own error message guidance.
  resourceGroupName: 'data',
})
