import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { getDiningMenuFn } from './get-dining-menu/resource'
import { searchUgaClassesFn } from './search-uga-classes/resource'
import { getProfessorRatingFn } from './get-professor-rating/resource'
import { getProfessorReviewsFn } from './get-professor-reviews/resource'
import { getWalkingRouteFn } from './get-walking-route/resource'
import { getFootballScheduleFn } from './get-football-schedule/resource'
import { findUserByEmailFn } from './find-user-by-email/resource'
import { getFriendScheduleFn } from './get-friend-schedule/resource'

const schema = a.schema({
  Post: a
    .model({
      board: a.enum(['GENERAL', 'HOUSING', 'CLASSES', 'BUY_SELL', 'EVENTS']),
      title: a.string().required(),
      body: a.string().required(),
      comments: a.hasMany('Comment', 'postId'),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),

  Comment: a
    .model({
      postId: a.id().required(),
      post: a.belongsTo('Post', 'postId'),
      body: a.string().required(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),

  ClassEntry: a
    .model({
      courseCode: a.string().required(),
      title: a.string(),
      day: a.string().required(),
      startTime: a.string().required(),
      endTime: a.string().required(),
      location: a.string(),
      locationLat: a.float(),
      locationLng: a.float(),
    })
    .authorization((allow) => [allow.owner()]),

  MapPreference: a
    .model({
      myDormBuilding: a.string(),
      myAcademicBuildings: a.string().array(),
    })
    .authorization((allow) => [allow.owner()]),

  // Friend request/relationship. senderId and recipientId are two independent
  // owner fields on the same row — the sender can create/read/cancel their own
  // outgoing request, and the recipient (a different user) can read it and flip
  // `status` to accept/decline, without either side being able to forge or edit
  // the other's half. Emails are denormalized so the friends drawer can render
  // pending requests without a second lookup.
  Friendship: a
    .model({
      senderId: a.string().required(),
      recipientId: a.string().required(),
      senderEmail: a.string().required(),
      recipientEmail: a.string().required(),
      status: a.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED']),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('senderId').to(['read', 'create', 'delete']),
      allow.ownerDefinedIn('recipientId').to(['read', 'update']),
    ]),

  DiningMenuItem: a.customType({
    name: a.string(),
    section: a.string(),
    dietary: a.string().array(),
    allergens: a.string().array(),
  }),

  DiningMenuResult: a.customType({
    hallSlug: a.string(),
    mealType: a.string(),
    date: a.string(),
    items: a.ref('DiningMenuItem').array(),
  }),

  getDiningMenu: a
    .query()
    .arguments({ hallSlug: a.string().required(), mealType: a.string().required() })
    .returns(a.ref('DiningMenuResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getDiningMenuFn)),

  UgaClassMeeting: a.customType({
    crn: a.string(),
    courseCode: a.string(),
    title: a.string(),
    section: a.string(),
    scheduleType: a.string(),
    instructor: a.string(),
    instructorFirstName: a.string(),
    instructorLastName: a.string(),
    days: a.string().array(),
    startTime: a.string(),
    endTime: a.string(),
    building: a.string(),
    room: a.string(),
  }),

  searchUgaClasses: a
    .query()
    .arguments({ query: a.string(), term: a.string(), subject: a.string(), level: a.string() })
    .returns(a.ref('UgaClassMeeting').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(searchUgaClassesFn)),

  ProfessorRating: a.customType({
    found: a.boolean(),
    id: a.string(),
    rating: a.float(),
    difficulty: a.float(),
    numRatings: a.integer(),
    wouldTakeAgainPercent: a.float(),
    department: a.string(),
  }),

  getProfessorRating: a
    .query()
    .arguments({ firstName: a.string().required(), lastName: a.string().required(), department: a.string() })
    .returns(a.ref('ProfessorRating'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getProfessorRatingFn)),

  ProfessorReview: a.customType({
    comment: a.string(),
    courseCode: a.string(),
    date: a.string(),
    difficultyRating: a.float(),
    clarityRating: a.float(),
    wouldTakeAgain: a.integer(),
    grade: a.string(),
  }),

  ProfessorReviewsResult: a.customType({
    reviews: a.ref('ProfessorReview').array(),
  }),

  getProfessorReviews: a
    .query()
    .arguments({ id: a.string().required() })
    .returns(a.ref('ProfessorReviewsResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getProfessorReviewsFn)),

  WalkingRouteCoordinate: a.customType({
    lat: a.float().required(),
    lng: a.float().required(),
  }),

  WalkingRouteResult: a.customType({
    distanceMeters: a.float(),
    durationSeconds: a.float(),
    coordinates: a.ref('WalkingRouteCoordinate').array(),
  }),

  getWalkingRoute: a
    .query()
    .arguments({
      fromLat: a.float().required(),
      fromLng: a.float().required(),
      toLat: a.float().required(),
      toLng: a.float().required(),
    })
    .returns(a.ref('WalkingRouteResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getWalkingRouteFn)),

  FootballGame: a.customType({
    gameId: a.string(),
    opponent: a.string(),
    isHome: a.boolean(),
    startTimeEpochMs: a.float(),
    gameState: a.string(),
    period: a.string(),
    clock: a.string(),
    teamScore: a.integer(),
    opponentScore: a.integer(),
  }),

  // Proxies data.ncaa.com's public scoreboard JSON (see get-football-schedule/handler.ts) —
  // has to run server-side since that endpoint sends no CORS headers for a direct browser call.
  getFootballSchedule: a
    .query()
    .arguments({ year: a.integer().required() })
    .returns(a.ref('FootballGame').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getFootballScheduleFn)),

  FindUserResult: a.customType({
    found: a.boolean(),
    userId: a.string(),
    username: a.string(),
    email: a.string(),
  }),

  // Looks up an existing DawgHub user by email (for "add friend by email") via
  // Cognito's admin ListUsers API — see amplify/auth/resource.ts for the scoped
  // IAM grant. The actual Friendship row is created declaratively by the client
  // afterward; this Lambda only does the part that needs elevated privilege.
  findUserByEmail: a
    .query()
    .arguments({ email: a.string().required() })
    .returns(a.ref('FindUserResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(findUserByEmailFn)),

  FriendClassEntry: a.customType({
    id: a.string(),
    courseCode: a.string(),
    title: a.string(),
    day: a.string(),
    startTime: a.string(),
    endTime: a.string(),
    location: a.string(),
    locationLat: a.float(),
    locationLng: a.float(),
  }),

  // Reads a friend's class schedule. ClassEntry stays allow.owner()-only for
  // everyone else — this Lambda gets its own narrowly-scoped direct DynamoDB read
  // grant (see amplify/backend.ts) and manually verifies an accepted Friendship
  // exists before returning anything. See get-friend-schedule/handler.ts for why
  // this couldn't be done as a normal AppSync-authorized model access.
  getFriendSchedule: a
    .query()
    .arguments({ friendUserId: a.string().required() })
    .returns(a.ref('FriendClassEntry').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getFriendScheduleFn)),

  // Raw (bus, stop) proximity samples written every minute by log-bus-arrivals — one row
  // per poll a bus is within range of a stop, including repeats while it lingers. Building
  // per-route/per-stop ETA stats means clustering these into discrete visits at query time.
  // Written via an API key (see log-bus-arrivals/handler.ts) rather than allow.resource()
  // because allow.resource() only exists at the schema level (a.schema({...}).authorization),
  // and only takes effect on a model that has no .authorization() rules of its own — it
  // can't grant access to a model like this one that already declares its own rules. (See
  // get-friend-schedule/handler.ts for a case that genuinely needs cross-user access to an
  // owner-only model — that uses a direct DynamoDB grant instead, for the same reason.)
  BusStopArrival: a
    .model({
      busId: a.string().required(),
      routeName: a.string().required(),
      stopId: a.string().required(),
      stopName: a.string().required(),
      arrivedAt: a.datetime().required(),
      latitude: a.float(),
      longitude: a.float(),
    })
    .authorization((allow) => [allow.publicApiKey().to(['create']), allow.authenticated().to(['read'])]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // Only used by log-bus-arrivals to write BusStopArrival rows — no other model grants
    // apiKey access, so a leaked key can only ever spam that one append-only log table.
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
})
