import type { Page } from '@playwright/test'

type GraphQLHandler = (variables: Record<string, unknown>) => unknown

// Intercepts AppSync calls at the network boundary instead of hitting the real deployed
// backend — deterministic, no AWS credentials/network needed, and safe to run in CI. Keyed by
// GraphQL operationName (e.g. "listClassEntries", "createClassEntry"), which Amplify's
// generated client always sets on the request body alongside `query`/`variables`.
export async function mockGraphQL(page: Page, handlers: Record<string, GraphQLHandler>) {
  await page.route('**/graphql', async (route) => {
    const request = route.request()
    const body = request.postDataJSON() as { operationName?: string; variables?: Record<string, unknown> }
    const operationName = body.operationName ?? ''
    const handler = handlers[operationName]

    if (!handler) {
      await route.fulfill({ status: 200, json: { data: null, errors: [{ message: `No mock for ${operationName}` }] } })
      return
    }

    await route.fulfill({ status: 200, json: { data: { [operationName]: handler(body.variables ?? {}) } } })
  })
}
