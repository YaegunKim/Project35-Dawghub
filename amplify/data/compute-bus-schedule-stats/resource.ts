import { defineFunction } from '@aws-amplify/backend'

export const computeBusScheduleStatsFn = defineFunction({
  name: 'compute-bus-schedule-stats',
  // The BusStopArrival history this aggregates only grows by a day's worth of samples between
  // runs, so recomputing more often than daily wouldn't change the output meaningfully — kept
  // well inside the Lambda free tier next to log-bus-arrivals' much more frequent 1-minute
  // polling (see that function's own resource.ts for the cost reasoning this mirrors).
  schedule: 'every day',
  // Writes one upsert per (route, weekday) + (route, hour) row — a few hundred across every
  // route, each 1-2 sequential GraphQL round trips (see handler.ts's upsertRouteScheduleStat).
  // 90s wasn't enough headroom for that fan-out in practice (confirmed: a manual invoke timed
  // out at 90s before this bump) — 5 minutes is still trivial cost for a once-a-day job.
  timeoutSeconds: 300,
  // A full-table Scan of several weeks of BusStopArrival plus in-memory cycle/segment
  // reconstruction for every route — still small (tens of thousands of rows at this app's
  // scale), but more headroom than log-bus-arrivals' 128MB since this isn't run often enough
  // for memory cost to matter the way it does there.
  memoryMB: 256,
  // Same reasoning as log-bus-arrivals: this function calls into the data stack's GraphQL API
  // (RouteScheduleStat writes) and reads the BusStopArrival table directly, so grouping it
  // into the data stack avoids a circular nested-stack dependency once backend.ts wires both
  // up.
  resourceGroupName: 'data',
})
