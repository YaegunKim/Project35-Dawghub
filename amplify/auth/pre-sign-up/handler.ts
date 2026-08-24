import type { PreSignUpTriggerHandler } from 'aws-lambda'

const ALLOWED_EMAIL_DOMAIN = '@uga.edu'

export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email?.toLowerCase() ?? ''

  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} email addresses can sign up.`)
  }

  return event
}
