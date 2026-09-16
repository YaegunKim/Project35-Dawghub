import { defineFunction } from '@aws-amplify/backend'

export const getCourseCatalogEntryFn = defineFunction({
  name: 'get-course-catalog-entry',
  timeoutSeconds: 15,
})
