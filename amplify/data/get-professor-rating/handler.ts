import type { AppSyncResolverHandler } from 'aws-lambda'

// Source: RateMyProfessors' own internal GraphQL API (what ratemyprofessors.com
// itself calls from the browser) — not a public/documented API, and RMP has no
// CORS support, so this runs server-side. The Basic auth value below is the
// same fixed "public" client credential RMP's own web app ships with; it's
// widely known/reverse-engineered, not a secret we obtained improperly.
const RMP_GRAPHQL_URL = 'https://www.ratemyprofessors.com/graphql'
const RMP_AUTH_HEADER = 'Basic dGVzdDp0ZXN0'

// base64("School-1101") — UGA's Athens campus school id on RateMyProfessors.
const UGA_SCHOOL_ID = 'U2Nob29sLTExMDE='

const SEARCH_QUERY = `
  query DawgHubTeacherSearch($text: String!, $schoolID: ID!) {
    newSearch {
      teachers(query: { text: $text, schoolID: $schoolID }) {
        edges {
          node {
            id
            firstName
            lastName
            department
            avgRating
            avgDifficulty
            numRatings
            wouldTakeAgainPercent
          }
        }
      }
    }
  }
`

type Args = {
  firstName: string
  lastName: string
  department?: string | null
}

type Result = {
  found: boolean
  id: string | null
  rating: number | null
  difficulty: number | null
  numRatings: number | null
  wouldTakeAgainPercent: number | null
  department: string | null
}

type RmpTeacherNode = {
  id: string
  firstName: string
  lastName: string
  department: string | null
  avgRating: number | null
  avgDifficulty: number | null
  numRatings: number | null
  wouldTakeAgainPercent: number | null
}

type RmpSearchResponse = {
  data?: {
    newSearch?: {
      teachers?: {
        edges?: { node: RmpTeacherNode }[]
      }
    }
  }
}

const NOT_FOUND: Result = {
  found: false,
  id: null,
  rating: null,
  difficulty: null,
  numRatings: null,
  wouldTakeAgainPercent: null,
  department: null,
}

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const firstName = (event.arguments.firstName ?? '').trim()
  const lastName = (event.arguments.lastName ?? '').trim()
  if (!firstName || !lastName) return NOT_FOUND

  const response = await fetch(RMP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: RMP_AUTH_HEADER,
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { text: `${firstName} ${lastName}`, schoolID: UGA_SCHOOL_ID },
    }),
  })

  if (!response.ok) return NOT_FOUND

  const body: RmpSearchResponse = await response.json()
  const nodes = (body.data?.newSearch?.teachers?.edges ?? []).map((edge) => edge.node)

  const normalize = (s: string) => s.trim().toLowerCase()
  const exactMatches = nodes.filter(
    (node) => normalize(node.firstName) === normalize(firstName) && normalize(node.lastName) === normalize(lastName),
  )
  if (exactMatches.length === 0) return NOT_FOUND

  let best = exactMatches[0]
  const department = event.arguments.department?.trim()
  if (exactMatches.length > 1 && department) {
    const deptLower = department.toLowerCase()
    const deptMatch = exactMatches.find((node) => {
      const nodeDept = node.department?.toLowerCase()
      return nodeDept && (deptLower.includes(nodeDept) || nodeDept.includes(deptLower))
    })
    if (deptMatch) best = deptMatch
  }

  return {
    found: true,
    id: best.id,
    rating: best.avgRating ?? null,
    difficulty: best.avgDifficulty ?? null,
    numRatings: best.numRatings ?? null,
    wouldTakeAgainPercent: best.wouldTakeAgainPercent ?? null,
    department: best.department ?? null,
  }
}
