/* eslint-disable lodash/prefer-is-nil */
import { getenv } from './getenv'

const WEB_PORT_DEV = getenv('WEB_PORT_DEV', null)
const WEB_PORT_PROD = getenv('WEB_PORT_PROD', null)
const devDomain = `http://localhost:${WEB_PORT_DEV}`
const prodDomain = `http://localhost:${WEB_PORT_PROD}`

const ENV_VARS = [
  // prettier-ignore
  'VERCEL_URL',
  'NOW_URL',
  'ZEIT_URL',
  'DEPLOY_PRIME_URL',
  'DEPLOY_URL',
  'URL',
]

export function getenvFirst(vars: string[]) {
  return vars.map((v) => getenv(v, null)).find((v) => v !== undefined && v !== null)
}

export function getDomain() {
  const DOMAIN = getenv('FULL_DOMAIN')
  if (DOMAIN === 'autodetect') {
    if (process.env.NODE_ENV === 'development') {
      return devDomain
    }

    if (process.env.NODE_ENV === 'production') {
      return prodDomain
    }

    const detectedDomain = getenvFirst(ENV_VARS)

    if (!detectedDomain) {
      throw new Error(
        `: Developer error: environment variable "DOMAIN" was set to "autodetect", but automatic detection failed.
           Here are the environment variables being looked for:
            ${ENV_VARS.map((v) => ` - ${v}=${getenv(v, null)}`).join('\n')}
        `,
      )
    }
  }
  return DOMAIN
}
