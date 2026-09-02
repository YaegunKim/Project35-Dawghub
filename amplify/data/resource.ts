import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { getDiningMenuFn } from './get-dining-menu/resource'
import { searchUgaClassesFn } from './search-uga-classes/resource'
import { getProfessorRatingFn } from './get-professor-rating/resource'
import { getProfessorReviewsFn } from './get-professor-reviews/resource'
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
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
