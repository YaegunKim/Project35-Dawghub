import { defineFunction, secret } from '@aws-amplify/backend'

export const getWalkingRouteFn = defineFunction({
  name: 'get-walking-route',
  timeoutSeconds: 15,
  environment: {
    ORS_API_KEY: secret('ORS_API_KEY'),
  },
})
