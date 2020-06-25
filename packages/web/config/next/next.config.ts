import path from 'path'

import type { NextConfig } from 'next'
import getWithMDX from '@next/mdx'
// import withBundleAnalyzer from '@zeit/next-bundle-analyzer'
import withPlugins from 'next-compose-plugins'
import nextRuntimeDotenv from 'next-runtime-dotenv'

import { findModuleRoot } from '../../lib/findModuleRoot'
import { getenv, getbool } from '../../lib/getenv'

import getWithEnvironment from './withEnvironment'
import getWithExtraWatch from './withExtraWatch'
import getWithFriendlyConsole from './withFriendlyConsole'
import getWithLodash from './withLodash'
import getWithStaticComprression from './webpackCompression'
import getWithTypeChecking from './withTypeChecking'
import withRaw from './withRaw'
import withSvg from './withSvg'
import withThreads from './withThreads'

const BABEL_ENV = getenv('BABEL_ENV')
const NODE_ENV = getenv('NODE_ENV')
const production = NODE_ENV === 'production'
// const development = NODE_ENV === 'development'
// const ANALYZE = getbool('ANALYZE')
// const PROFILE = getbool('PROFILE')
const DEV_ENABLE_ESLINT = getbool('DEV_ENABLE_ESLINT')
const DEV_ENABLE_TYPE_CHECKS = getbool('DEV_ENABLE_TYPE_CHECKS')
// const DEV_ENABLE_STYLELINT = getbool('DEV_ENABLE_STYLELINT')
const DEV_ENABLE_REDUX_DEV_TOOLS = getbool('DEV_ENABLE_REDUX_DEV_TOOLS')
const DEV_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT = getbool('DEV_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT')
const PROD_ENABLE_SOURCE_MAPS = getbool('PROD_ENABLE_SOURCE_MAPS')
const PROD_ENABLE_ESLINT = getbool('PROD_ENABLE_ESLINT')
const PROD_ENABLE_TYPE_CHECKS = getbool('PROD_ENABLE_TYPE_CHECKS')
// const PROD_ENABLE_STYLELINT = getbool('PROD_ENABLE_STYLELINT')
const PROD_ENABLE_REDUX_DEV_TOOLS = getbool('PROD_ENABLE_REDUX_DEV_TOOLS')
const PROD_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT = getbool('PROD_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT')

const ENABLE_REDUX_DEV_TOOLS = (production ? PROD_ENABLE_REDUX_DEV_TOOLS : DEV_ENABLE_REDUX_DEV_TOOLS) ? '1' : '0'
const ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT = (production ? PROD_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT : DEV_ENABLE_REDUX_IMMUTABLE_STATE_INVARIANT) ? '1' : "0" // prettier-ignore
const ENABLE_ESLINT = PROD_ENABLE_ESLINT || DEV_ENABLE_ESLINT
const ENABLE_TYPE_CHECKING = PROD_ENABLE_TYPE_CHECKS || DEV_ENABLE_TYPE_CHECKS

const { pkg, moduleRoot } = findModuleRoot()

const nextConfig: NextConfig = {
  distDir: `.build/${process.env.NODE_ENV}/tmp`,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  experimental: {
    modern: false, // this breaks Threads.js workers in production
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

const withExtraWatch = getWithExtraWatch({
  files: [path.join(moduleRoot, 'src/types/**/*.d.ts')],
  dirs: [],
})

const withLodash = getWithLodash({ unicode: false })

const withStaticComprression = getWithStaticComprression({ brotli: false })

const withTypeChecking = getWithTypeChecking({
  typeChecking: ENABLE_TYPE_CHECKING,
  eslint: ENABLE_ESLINT,
  memoryLimit: 2048,
})

const config = withConfig(
  withPlugins(
    [
      [withEnvironment],
      [withExtraWatch],
      [withThreads],
      [withSvg],
      [withRaw],
      // ANALYZE && [withBundleAnalyzer],
      [withFriendlyConsole],
      [withMDX, { pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'] }],
      [withLodash],
      [withTypeChecking],
      production && [withStaticComprression],
    ].filter(Boolean),
    nextConfig,
  ),
)

export default config
