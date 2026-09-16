import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { getDiningMenuFn } from './get-dining-menu/resource'
import { searchUgaClassesFn } from './search-uga-classes/resource'
import { getProfessorRatingFn } from './get-professor-rating/resource'
import { getProfessorReviewsFn } from './get-professor-reviews/resource'
import { getWalkingRouteFn } from './get-walking-route/resource'
import { getFootballScheduleFn } from './get-football-schedule/resource'
import { findUserByEmailFn } from './find-user-by-email/resource'
import { getFriendScheduleFn } from './get-friend-schedule/resource'
import { getCourseCatalogEntryFn } from './get-course-catalog-entry/resource'
import { getThreadAnonLabelsFn } from './get-thread-anon-labels/resource'

const schema = a.schema({
  // Board-specific fields below are all optional and only populated by the board that
  // uses them (see ai/SPEC.md) — General/Housing/Classes/Events share this one model
  // rather than one-per-board, since they're all fundamentally a title+body+comments
  // discussion post with a few extra structured attributes layered on top. Buy & Sell
  // is the exception (see MarketplaceListing below) — a listing's identity (price,
  // photos, sold-status) and query pattern (filter by status/category, hide sold) is
  // different in kind from a discussion feed, so it isn't just "Post with more fields."
  Post: a
    .model({
      board: a.enum(['GENERAL', 'HOUSING', 'CLASSES', 'BUY_SELL', 'EVENTS']),
      title: a.string().required(),
      body: a.string().required(),
      comments: a.hasMany('Comment', 'postId'),
      // General: NOTICE | FREE_TALK | QNA | TIMETABLE. Housing: DORM_REVIEW | SUBLEASE | ROOMMATE_SEARCH.
      category: a.string(),
      // Classes only — validated client-side against searchUgaClasses results at post-creation time.
      courseCode: a.string(),
      // Housing DORM_REVIEW/SUBLEASE/ROOMMATE_SEARCH only — autocompleted from fetchUgaBuildings().
      dormBuilding: a.string(),
      // Housing SUBLEASE/ROOMMATE_SEARCH only.
      moveInDate: a.date(),
      moveOutDate: a.date(),
      monthlyRent: a.float(),
      // Events only.
      eventDate: a.date(),
      eventStartTime: a.string(),
      eventEndTime: a.string(),
      eventLocation: a.string(),
      externalLink: a.url(),
      tags: a.string().array(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),

  Comment: a
    .model({
      postId: a.id().required(),
      post: a.belongsTo('Post', 'postId'),
      body: a.string().required(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),

  // A like on a Post — one row per (post, liker). The client sets `id` deterministically
  // to `${postId}_${ownerIdentityHint}` at creation time (see src/lib/postLikes.ts) purely
  // so "like" is naturally idempotent (create-if-absent, delete-to-unlike) without needing
  // a separate composite-key secondary index just to check "did I already like this."
  // likeCount is computed client-side from a list() query rather than a maintained
  // aggregate field — General's like button is a lightweight, non-realtime signal, not a
  // high-traffic counter that needs a streams-triggered aggregate.
  PostLike: a
    .model({
      postId: a.id().required(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(['read'])]),

  MarketplaceListing: a
    .model({
      title: a.string().required(),
      description: a.string().required(),
      price: a.float().required(),
      category: a.enum(['TEXTBOOKS', 'FURNITURE', 'ELECTRONICS', 'CLOTHING', 'TICKETS', 'OTHER']),
      condition: a.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
      status: a.enum(['ACTIVE', 'RESERVED', 'SOLD']),
      // S3 object keys (Amplify Storage, amplify/storage/resource.ts), not full URLs —
      // resolved to a displayable URL client-side via getUrl().
      photoKeys: a.string().array(),
      // Denormalized at creation time, same pattern as Friendship.senderEmail/recipientEmail —
      // lets "Contact seller" reveal an email without a second privileged lookup.
      sellerEmail: a.string().required(),
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

  CourseCatalogEntry: a.customType({
    found: a.boolean(),
    courseCode: a.string(),
    creditHours: a.string(),
    description: a.string(),
    prerequisites: a.string(),
  }),

  // Proxies bulletin.uga.edu's course catalog (credit hours / description / prerequisites)
  // from the server — same "unofficial, undocumented, can break silently" category as
  // searchUgaClasses' reg.uga.edu CSV and getProfessorRating's RMP call above. See
  // ai/TRD.md §4.4 and get-course-catalog-entry/handler.ts.
  getCourseCatalogEntry: a
    .query()
    .arguments({ courseCode: a.string().required() })
    .returns(a.ref('CourseCatalogEntry'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getCourseCatalogEntryFn)),

  ThreadAnonLabel: a.customType({
    commentId: a.string(),
    // A plain ordinal (1, 2, 3, ...), not a pre-formatted string — the client renders
    // it through i18n (e.g. "익명1" / "Anonymous 1") so the label stays translatable.
    anonNumber: a.integer(),
  }),

  ThreadAnonLabelsResult: a.customType({
    labels: a.ref('ThreadAnonLabel').array(),
  }),

  // Computes Everytime-style per-thread anonymous labels ("익명1", "익명2", ...) for every
  // distinct commenter on a post, in order of first appearance. Deliberately NOT stored on
  // Comment itself and NOT derivable client-side: a client only ever sees its own `owner`
  // value on rows it can read, never enough to distinguish "commenter A twice" from
  // "commenter A then B" across other users' rows. Instead this Lambda gets a scoped direct
  // DynamoDB read grant on the Comment table (see backend.ts, same pattern as
  // get-friend-schedule) and computes labels fresh on every call — cheap at this app's
  // per-thread comment volume, and avoids ever writing/exposing a raw owner identity string
  // to the client. See ai/TRD.md §4.5.
  getThreadAnonLabels: a
    .query()
    .arguments({ postId: a.string().required() })
    .returns(a.ref('ThreadAnonLabelsResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getThreadAnonLabelsFn)),

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
