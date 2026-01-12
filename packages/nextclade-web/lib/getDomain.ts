/* eslint-disable lodash/prefer-is-nil */
import isInteractive from 'is-interactive'

import { getenv } from './getenv'

const CI_ENV_VARS = ['VERCEL_URL', 'NOW_URL', 'ZEIT_URL', 'DEPLOY_PRIME_URL', 'DEPLOY_URL', 'URL']

function getenvFirst(vars: string[]) {
  return vars.map((v) => getenv(v, null)).find((v) => v !== undefined && v !== null)
}

export function getDomain() {
  const WEB_PORT_DEV = getenv('WEB_PORT_DEV', null)
  const WEB_PORT_PROD = getenv('WEB_PORT_PROD', null)
  const devDomain = `http://localhost:${WEB_PORT_DEV}`
  const prodDomain = `http://localhost:${WEB_PORT_PROD}`

  let DOMAIN = getenv('FULL_DOMAIN')

  if (DOMAIN === 'autodetect') {
    const interactive = isInteractive()

    if (interactive && process.env.NODE_ENV === 'development') {
      return devDomain
    }

    if (interactive && process.env.NODE_ENV === 'production') {
      return prodDomain
    }

    const detectedDomain = getenvFirst(CI_ENV_VARS)

    if (detectedDomain) {
      DOMAIN = detectedDomain
    } else {
      // Fall back to localhost for local non-interactive builds (CI builds should set one of CI_ENV_VARS)
      DOMAIN = process.env.NODE_ENV === 'production' ? prodDomain : devDomain
    }
  }

  if (!DOMAIN.startsWith('http')) {
    DOMAIN = `https://${DOMAIN}`
  }

  return DOMAIN
}
