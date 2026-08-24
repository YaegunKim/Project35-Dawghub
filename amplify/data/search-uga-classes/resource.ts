import { defineFunction } from '@aws-amplify/backend'

export const searchUgaClassesFn = defineFunction({
  name: 'search-uga-classes',
  timeoutSeconds: 30,
})
