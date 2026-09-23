import { defineBackend } from '@aws-amplify/backend'
import type { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { storage } from './storage/resource'
import { logBusArrivalsFn } from './data/log-bus-arrivals/resource'
import { computeBusScheduleStatsFn } from './data/compute-bus-schedule-stats/resource'
import { getFriendScheduleFn } from './data/get-friend-schedule/resource'
import { findUserByEmailFn } from './data/find-user-by-email/resource'
import { getThreadAnonLabelsFn } from './data/get-thread-anon-labels/resource'

const backend = defineBackend({
  auth,
  data,
  storage,
  logBusArrivalsFn,
  computeBusScheduleStatsFn,
  getFriendScheduleFn,
  findUserByEmailFn,
  getThreadAnonLabelsFn,
})

// log-bus-arrivals isn't wired to any query/mutation in the schema (it's schedule-triggered,
// see log-bus-arrivals/resource.ts), so it has no other way to reach the GraphQL API — hand
// it the endpoint + an apiKey scoped to BusStopArrival-create only (see data/resource.ts).
// `.resources.lambda` is typed as the generic CDK `IFunction`, which lacks `addEnvironment` —
// cast to the concrete `Function` it actually is (same pattern Amplify's own docs use).
const logBusArrivalsLambda = backend.logBusArrivalsFn.resources.lambda as LambdaFunction
logBusArrivalsLambda.addEnvironment('GRAPHQL_ENDPOINT', backend.data.graphqlUrl)
logBusArrivalsLambda.addEnvironment('GRAPHQL_API_KEY', backend.data.apiKey ?? '')

// compute-bus-schedule-stats writes RouteScheduleStat the same apiKey way as above (it also
// reads a row back first to decide create vs. update — see its handler.ts), but reads
// BusStopArrival directly off DynamoDB instead of through GraphQL/apiKey: a full-table scan
// with a date-range filter has no equivalent as a generated AppSync query, the same reason
// get-friend-schedule/get-thread-anon-labels below go straight to DynamoDB for their reads.
const computeBusScheduleStatsLambda = backend.computeBusScheduleStatsFn.resources.lambda as LambdaFunction
computeBusScheduleStatsLambda.addEnvironment('GRAPHQL_ENDPOINT', backend.data.graphqlUrl)
computeBusScheduleStatsLambda.addEnvironment('GRAPHQL_API_KEY', backend.data.apiKey ?? '')
const busStopArrivalTable = backend.data.resources.tables['BusStopArrival']
busStopArrivalTable.grantReadData(computeBusScheduleStatsLambda)
computeBusScheduleStatsLambda.addEnvironment('BUS_STOP_ARRIVAL_TABLE_NAME', busStopArrivalTable.tableName)

// get-friend-schedule needs to read ClassEntry (a friend's schedule) and Friendship
// rows for a user other than the caller, which ClassEntry's allow.owner()-only auth
// deliberately forbids through the normal AppSync path — and allow.resource() can't
// grant it either, since that only takes effect on models with no auth rules of their
// own (see the comment on BusStopArrival in data/resource.ts). Instead, grant this one
// Lambda's execution role direct DynamoDB read access to the underlying tables — scoped
// to only this function, and it does its own friendship check in the handler before
// returning anything. ClassEntry's own AppSync-path behavior for every other caller is
// untouched.
const friendScheduleLambda = backend.getFriendScheduleFn.resources.lambda as LambdaFunction
const classEntryTable = backend.data.resources.tables['ClassEntry']
const friendshipTable = backend.data.resources.tables['Friendship']
classEntryTable.grantReadData(friendScheduleLambda)
friendshipTable.grantReadData(friendScheduleLambda)
friendScheduleLambda.addEnvironment('CLASS_ENTRY_TABLE_NAME', classEntryTable.tableName)
friendScheduleLambda.addEnvironment('FRIENDSHIP_TABLE_NAME', friendshipTable.tableName)

// find-user-by-email (the "add friend by email" lookup) needs a scoped read-only
// cognito-idp:ListUsers grant on the User Pool. Granted here at the top-level backend
// scope, a sibling of both the auth and data nested stacks, rather than through
// defineAuth's `access` builder (which would attach the grant from *inside* the auth
// stack) — this function lives in the data stack (it's a query resolver), and data
// already depends on auth for userPool-mode authorization, so an auth->data reference
// on top of that would be a circular nested-stack dependency. See auth/resource.ts.
const findUserByEmailLambda = backend.findUserByEmailFn.resources.lambda as LambdaFunction
backend.auth.resources.userPool.grant(findUserByEmailLambda, 'cognito-idp:ListUsers')
findUserByEmailLambda.addEnvironment('USERPOOL_ID', backend.auth.resources.userPool.userPoolId)

// get-thread-anon-labels needs to read every commenter's `owner` value across an entire
// thread to compute Everytime-style per-thread anonymous numbering (ai/TRD.md §4.5) — a
// normal AppSync-authorized read only ever exposes the caller's own rows in that way, so
// (same reasoning/pattern as get-friend-schedule above) grant this one Lambda's execution
// role direct DynamoDB read access to the Comment table instead. It only ever returns a
// derived ordinal, never the raw `owner` string, back to any client.
const threadAnonLabelsLambda = backend.getThreadAnonLabelsFn.resources.lambda as LambdaFunction
const commentTable = backend.data.resources.tables['Comment']
commentTable.grantReadData(threadAnonLabelsLambda)
threadAnonLabelsLambda.addEnvironment('COMMENT_TABLE_NAME', commentTable.tableName)
