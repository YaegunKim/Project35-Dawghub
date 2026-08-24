import { defineFunction } from '@aws-amplify/backend'

export const getProfessorReviewsFn = defineFunction({
  name: 'get-professor-reviews',
  timeoutSeconds: 15,
})
