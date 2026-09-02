import { defineFunction } from '@aws-amplify/backend'

export const logBusArrivalsFn = defineFunction({
  name: 'log-bus-arrivals',
  schedule: 'every 1m',
  timeoutSeconds: 30,
  // Without this, CDK puts the function in its own nested stack, which forms a circular
  // dependency with `data` once backend.ts wires the GraphQL endpoint/key into it as env
  // vars — grouping it into the data stack (which it calls into anyway) avoids the cycle.
  resourceGroupName: 'data',
})
