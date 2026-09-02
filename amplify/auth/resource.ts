import { defineAuth } from '@aws-amplify/backend'
import { preSignUp } from './pre-sign-up/resource'

// find-user-by-email needs a scoped cognito-idp:ListUsers grant on this User Pool —
// that's wired directly in amplify/backend.ts (a plain CDK UserPool.grant() call at
// the top-level backend scope) rather than via defineAuth's `access` builder here.
// The `access` builder attaches the grant from *within* the auth nested stack, but
// find-user-by-email also has to live in the data stack (it's a query resolver) —
// having auth's stack reference a data-stack function while data's stack already
// depends on auth (userPool-mode authorization) is a circular nested-stack
// dependency. Granting from backend.ts's top-level scope avoids that: it's a sibling
// of both nested stacks, not nested inside either.
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  triggers: {
    preSignUp,
  },
})
