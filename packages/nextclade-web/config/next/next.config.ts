import { config as loadEnv } from 'dotenv'
import { NextConfig } from 'next'
import getWithMDX from '@next/mdx'
import remarkBreaks from 'remark-breaks'
import remarkImages from 'remark-images'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'
import getWithEslint from './withEslint'
import getWithExternals from './withExternals'
import getWithExtraWatch from './withExtraWatch'
import withFriendlyChunkNames from './withFriendlyChunkNames'
import getWithFriendlyConsole from './withFriendlyConsole'
import withIgnore from './withIgnore'
import withRaw from './withRaw'
import withResolve from './withResolve'
import withSvg from './withSvg'
import getWithTypeChecking from './withTypeChecking'
import withWasm from './withWasm'
import { getWithEmitFile } from './withEmitFile'
import type { AppJson } from '../../src/components/Layout/UpdateNotification'
import { RELEASE_URL } from '../../src/constants'
import { getBuildNumber } from '../../lib/getBuildNumber'
import { getBuildUrl } from '../../lib/getBuildUrl'
import { getDomain } from '../../lib/getDomain'
import { getGitBranch } from '../../lib/getGitBranch'
import { getGitCommitHash } from '../../lib/getGitCommitHash'
import { getenv } from '../../lib/getenv'
import { findModuleRoot } from '../../lib/findModuleRoot'
import { getBrowserSupport } from './getBrowserSupport'

const { pkg, moduleRoot } = findModuleRoot()

loadEnv({ path: `${moduleRoot}/../../.env` })

const browserSupport = getBrowserSupport(pkg.browserslist.production)
const wasmFeatures: string[] = pkg.wasmFeatures ?? []

const PRODUCTION = process.env.NODE_ENV === 'production'
const DOMAIN = getDomain()
const DOMAIN_STRIPPED = DOMAIN.replace('https://', '').replace('http://', '')
const DATA_FULL_DOMAIN = getenv('DATA_FULL_DOMAIN')
const DATA_TRY_GITHUB_BRANCH = getenv('DATA_TRY_GITHUB_BRANCH') ?? undefined
const BRANCH_NAME = getGitBranch() ?? undefined
const COMMIT_HASH = getGitCommitHash() ?? undefined
const BUILD_NUMBER = getBuildNumber() ?? undefined
const BUILD_URL = getBuildUrl() ?? undefined
const BLOCK_SEARCH_INDEXING = DOMAIN === RELEASE_URL ? '0' : '1'

const env = {
  DOMAIN,
  DOMAIN_STRIPPED,
  DATA_FULL_DOMAIN,
  DATA_TRY_GITHUB_BRANCH,
  PACKAGE_NAME: pkg.name,
  PACKAGE_VERSION: pkg.version,
  BRANCH_NAME,
  COMMIT_HASH,
  BUILD_NUMBER,
  BUILD_URL,
  BLOCK_SEARCH_INDEXING,
  BROWSER_SUPPORT: JSON.stringify(browserSupport),
  WASM_FEATURES: JSON.stringify(wasmFeatures),
}

const appJson = {
  name: pkg.name,
  version: pkg.version,
  branchName: BRANCH_NAME,
  commitHash: COMMIT_HASH,
  buildNumber: BUILD_NUMBER,
  buildUrl: BUILD_URL,
  domain: DOMAIN,
  domainStripped: DOMAIN_STRIPPED,
  dataFullDomain: DATA_FULL_DOMAIN,
  blockSearchIndexing: BLOCK_SEARCH_INDEXING,
} satisfies AppJson

const nextConfig: NextConfig = {
  output: 'export',
  cleanDistDir: true,
  distDir: PRODUCTION ? '.build/production/web' : `.build/${process.env.NODE_ENV}/web`,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  reactStrictMode: true,
  experimental: {
    mdxRs: false,
    scrollRestoration: true,
    swcPlugins: [
      // ['@swc-jotai/debug-label', { atomNames: ['customAtom'] }],
      // ['@swc-jotai/react-refresh', { atomNames: ['customAtom'] }],
    ],
  },
  productionBrowserSourceMaps: true,
  excludeDefaultMomentLocales: true,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  compiler: {
    styledComponents: true,
  },
  poweredByHeader: false,
  transpilePackages: [
    'auspice',
    'd3-array',
    'd3-axis',
    'd3-brush',
    'd3-collection',
    'd3-color',
    'd3-dispatch',
    'd3-drag',
    'd3-ease',
    'd3-format',
    'd3-interpolate',
    'd3-path',
    'd3-scale',
    'd3-selection',
    'd3-shape',
    'd3-time',
    'd3-time-format',
    'd3-timer',
    'd3-transition',
    'd3-zoom',
    'debug',
    'jotai-devtools',
    'semver',
  ],
  env,
}

const withExternals = getWithExternals({ externals: ['canvas'] })

const withMDX = getWithMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkBreaks, remarkImages, remarkMath, [remarkToc, { tight: true }]],
    rehypePlugins: [],
  },
})

const withFriendlyConsole = getWithFriendlyConsole({
  clearConsole: false,
  projectRoot: '.',
  packageName: 'web',
  progressBarColor: '#2a68ff',
})

const withExtraWatch = getWithExtraWatch({
  files: ['src/types/**/*.d.ts'],
  dirs: [],
})

const withTypeChecking = getWithTypeChecking({
  typeChecking: true,
  memoryLimit: 2048,
  exclude: ['src/bin'],
})

const withEslint = getWithEslint({
  eslint: true,
})

// This generated files need to be copied to dist dir after build:
// "next:prod:postbuild": "cp -avr .next/static/{app.json,robots.txt} .build/production/web/",
// TODO: after transition to App Router, use route handlers to generate files
// https://nextjs.org/docs/app/guides/static-exports#route-handlers
const withAppJson = getWithEmitFile({
  path: 'static/',
  filename: 'app.json',
  content: JSON.stringify(appJson, null, 2),
  hash: false,
})
const withRobotsTxt = getWithEmitFile({
  path: 'static/',
  filename: 'robots.txt',
  content: `User-agent: *\nDisallow:${BRANCH_NAME === 'release' ? '' : ' *'}\n`,
  hash: false,
})

const plugins = [
  withIgnore,
  withExternals,
  withExtraWatch,
  withSvg,
  withFriendlyConsole,
  withMDX,
  withTypeChecking,
  withEslint,
  withFriendlyChunkNames,
  withRaw,
  withResolve,
  withWasm,
  withAppJson,
  withRobotsTxt,
].filter(Boolean)

export default () => plugins.reduce((acc, next) => next(acc), nextConfig)
