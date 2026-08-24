import { defineFunction } from '@aws-amplify/backend'

export const getProfessorRatingFn = defineFunction({
  name: 'get-professor-rating',
  timeoutSeconds: 15,
})
