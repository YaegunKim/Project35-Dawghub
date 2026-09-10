import { defineFunction } from '@aws-amplify/backend'

export const getThreadAnonLabelsFn = defineFunction({
  name: 'get-thread-anon-labels',
  timeoutSeconds: 10,
  // Needs backend.data.resources.tables['Comment'] in backend.ts (a data-stack reference),
  // and the data stack's resolver references this function back — pin to the data stack to
  // avoid a circular nested-stack dependency. Same reasoning as get-friend-schedule.
  resourceGroupName: 'data',
})
