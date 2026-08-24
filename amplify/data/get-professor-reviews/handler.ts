import type { AppSyncResolverHandler } from 'aws-lambda'

// Same RateMyProfessors internal GraphQL API as get-professor-rating — see the
// comment there for why this runs server-side and what the auth header is.
const RMP_GRAPHQL_URL = 'https://www.ratemyprofessors.com/graphql'
const RMP_AUTH_HEADER = 'Basic dGVzdDp0ZXN0'

const MAX_REVIEWS = 10

const REVIEWS_QUERY = `
  query DawgHubTeacherReviews($id: ID!, $first: Int!) {
    node(id: $id) {
      ... on Teacher {
        ratings(first: $first) {
          edges {
            node {
              comment
              class
              date
              difficultyRating
              clarityRating
              wouldTakeAgain
              grade
            }
          }
        }
      }
    }
  }
`

type Args = {
  id: string
}

type Review = {
  comment: string
  courseCode: string
  date: string
  difficultyRating: number | null
  clarityRating: number | null
  wouldTakeAgain: number | null
  grade: string | null
}

type Result = {
  reviews: Review[]
}

type RmpReviewNode = {
  comment: string | null
  class: string | null
  date: string | null
  difficultyRating: number | null
  clarityRating: number | null
  wouldTakeAgain: number | null
  grade: string | null
}

type RmpReviewsResponse = {
  data?: {
    node?: {
      ratings?: {
        edges?: { node: RmpReviewNode }[]
      }
    } | null
  }
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const id = (event.arguments.id ?? '').trim()
  if (!id) return { reviews: [] }

  const response = await fetch(RMP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: RMP_AUTH_HEADER,
    },
    body: JSON.stringify({
      query: REVIEWS_QUERY,
      variables: { id, first: MAX_REVIEWS },
    }),
  })

  if (!response.ok) return { reviews: [] }

  const body: RmpReviewsResponse = await response.json()
  const nodes = (body.data?.node?.ratings?.edges ?? []).map((edge) => edge.node)

  const reviews: Review[] = nodes
    .filter((node) => Boolean(node.comment?.trim()))
    .map((node) => ({
      comment: node.comment ?? '',
      courseCode: node.class ?? '',
      date: node.date ?? '',
      difficultyRating: node.difficultyRating ?? null,
      clarityRating: node.clarityRating ?? null,
      wouldTakeAgain: node.wouldTakeAgain ?? null,
      grade: node.grade ?? null,
    }))

  return { reviews }
}
