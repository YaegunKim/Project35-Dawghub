import { defineFunction } from '@aws-amplify/backend'

export const logBusArrivalsFn = defineFunction({
  name: 'log-bus-arrivals',
  // EventBridge's schedule rate can't go below 1 minute, so a faster-than-1-minute poll
  // cadence (see handler.ts's POLL_COUNT/POLL_INTERVAL_MS) has to happen *inside* one
  // invocation instead of via more frequent triggers.
  schedule: 'every 1m',
  timeoutSeconds: 55,
  // This only fetches two small JSON payloads and POSTs a handful of GraphQL mutations —
  // 128MB is plenty. Kept low deliberately: the polling loop below made each invocation run
  // ~45s instead of ~1-2s, and at the default 512MB that alone would burn through the Lambda
  // free tier's 400,000 GB-seconds/month; at 128MB the same loop stays well inside it.
  memoryMB: 128,
  // Without this, CDK puts the function in its own nested stack, which forms a circular
  // dependency with `data` once backend.ts wires the GraphQL endpoint/key into it as env
  // vars — grouping it into the data stack (which it calls into anyway) avoids the cycle.
  resourceGroupName: 'data',
})
