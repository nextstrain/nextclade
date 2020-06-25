import { getbool, getenv } from '../../../lib/getenv'

export function getEnvVars() {
  const BABEL_ENV = getenv('BABEL_ENV')
  const NODE_ENV = getenv('NODE_ENV')
  const ANALYZE = getbool('ANALYZE')
  const PROFILE = getbool('PROFILE')
  const PRODUCTION = NODE_ENV === 'production'

  const common = {
    BABEL_ENV,
    NODE_ENV,
    ANALYZE,
    PROFILE,
    PRODUCTION,
  }

  if (PRODUCTION) {
    return {
      ...common,
      ENABLE_SOURCE_MAPS: getbool('PROD_ENABLE_SOURCE_MAPS'),
      ENABLE_ESLINT: getbool('PROD_ENABLE_ESLINT'),
      ENABLE_TYPE_CHECKS: getbool('PROD_ENABLE_TYPE_CHECKS'),
      ENABLE_STYLELINT: getbool('PROD_ENABLE_STYLELINT'),
      ENABLE_REDUX_DEV_TOOLS: getbool('PROD_ENABLE_REDUX_DEV_TOOLS'),
      ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT: getbool('PROD_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT'),
    }
  }

  return {
    ...common,
    ENABLE_SOURCE_MAPS: true,
    ENABLE_ESLINT: getbool('DEV_ENABLE_ESLINT'),
    ENABLE_TYPE_CHECKS: getbool('DEV_ENABLE_TYPE_CHECKS'),
    ENABLE_STYLELINT: getbool('DEV_ENABLE_STYLELINT'),
    ENABLE_REDUX_DEV_TOOLS: getbool('DEV_ENABLE_REDUX_DEV_TOOLS'),
    ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT: getbool('DEV_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT'),
  }
}
