import path from 'path'

import type { NextConfig } from 'next'
import getWithMDX from '@next/mdx'
// import withBundleAnalyzer from '@zeit/next-bundle-analyzer'
import withPlugins from 'next-compose-plugins'
import nextRuntimeDotenv from 'next-runtime-dotenv'

import { findModuleRoot } from '../../lib/findModuleRoot'
import { getenv, getbool } from '../../lib/getenv'

import getWithEnvironment from './withEnvironment'
import getWithFriendlyConsole from './withFriendlyConsole'
import getWithLodash from './withLodash'
import getWithTypeChecking from './withTypeChecking'
import withSvg from './withSvg'
import withWorker from './withWorker'
import getWithStaticComprression from './webpackCompression'

const BABEL_ENV = getenv('BABEL_ENV')
const NODE_ENV = getenv('NODE_ENV')
const production = NODE_ENV === 'production'
// const development = NODE_ENV === 'development'
// const ANALYZE = getbool('ANALYZE')
// const PROFILE = getbool('PROFILE')
const DEV_ENABLE_TYPE_CHECKS = getenv('DEV_ENABLE_TYPE_CHECKS')
const DEV_ENABLE_ESLINT = getbool('DEV_ENABLE_ESLINT')
// const DEV_ENABLE_STYLELINT = getbool('DEV_ENABLE_STYLELINT')
const DEV_ENABLE_REDUX_DEV_TOOLS = getenv('DEV_ENABLE_REDUX_DEV_TOOLS')
const DEV_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT = getenv('DEV_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT')
const PROD_ENABLE_SOURCE_MAPS = getbool('PROD_ENABLE_SOURCE_MAPS')
const PROD_ENABLE_REDUX_DEV_TOOLS = getenv('PROD_ENABLE_REDUX_DEV_TOOLS')
const PROD_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT = getenv('PROD_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT')

const ENABLE_REDUX_DEV_TOOLS = production ? PROD_ENABLE_REDUX_DEV_TOOLS : DEV_ENABLE_REDUX_DEV_TOOLS
const ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT = production ? PROD_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT : DEV_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT // prettier-ignore
const ENABLE_ESLINT = production || DEV_ENABLE_ESLINT

const { pkg, moduleRoot } = findModuleRoot()

const nextConfig: NextConfig = {
  distDir: `.build/${process.env.NODE_ENV}/tmp`,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  experimental: {
    modern: true,
    productionBrowserSourceMaps: PROD_ENABLE_SOURCE_MAPS,
  },
  future: {
    excludeDefaultMomentLocales: true,
  },
  devIndicators: {
    buildActivity: false,
    autoPrerender: true,
  },
  typescript: {
    ignoreDevErrors: true,
    ignoreBuildErrors: true,
  },
}

const withConfig = nextRuntimeDotenv()

const withMDX = getWithMDX({
  extension: /\.mdx?$/,
  remarkPlugins: ['remark-images', 'remark-math'].map(require),
  rehypePlugins: ['rehype-katex'].map(require),
})

const withFriendlyConsole = getWithFriendlyConsole({
  clearConsole: false,
  projectRoot: path.resolve(moduleRoot),
  packageName: pkg.name || 'web',
  progressBarColor: 'blue',
})

const withEnvironment = getWithEnvironment({
  BABEL_ENV,
  NODE_ENV,
  ENABLE_REDUX_DEV_TOOLS,
  ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT,
})

const withLodash = getWithLodash({ unicode: false })

const withStaticComprression = getWithStaticComprression({ brotli: false })

const withTypeChecking = getWithTypeChecking({
  eslint: ENABLE_ESLINT,
  warningsAreErrors: production,
  memoryLimit: 2048,
  tsconfig: path.join(moduleRoot, 'tsconfig.json'),
  reportFiles: [
    'src/**/*.{js,jsx,ts,tsx}',

    // FIXME: errors in these files have to be resolved eventually
    // begin
    '!src/algorithms/**', // FIXME
    // end

    '!src/**/*.(spec|test).{js,jsx,ts,tsx}',
    '!src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '!src/*generated*/**/*',
    '!src/algorithms/__test_data__/**/*',
    '!src/styles/**/*',
    '!static/**/*',
  ],
})

const config = withConfig(
  withPlugins(
    [
      [withEnvironment],
      [withWorker],
      [withSvg],
      // ANALYZE && [withBundleAnalyzer],
      [withFriendlyConsole],
      [withMDX, { pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'] }],
      [withLodash],
      DEV_ENABLE_TYPE_CHECKS && [withTypeChecking],
      production && [withStaticComprression],
    ].filter(Boolean),
    nextConfig,
  ),
)

export default config
