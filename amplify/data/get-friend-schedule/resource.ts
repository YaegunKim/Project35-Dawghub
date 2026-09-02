import { defineFunction } from '@aws-amplify/backend'

export const getFriendScheduleFn = defineFunction({
  name: 'get-friend-schedule',
  timeoutSeconds: 15,
  // Same reasoning as find-user-by-email: it's both a data resolver (data stack
  // references it) and needs backend.data.resources.tables[...] in backend.ts
  // (it references the data stack back) — pin it to the data stack to avoid the
  // resulting circular nested-stack dependency.
  resourceGroupName: 'data',
})
