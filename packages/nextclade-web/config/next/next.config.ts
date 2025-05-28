import { NextConfig } from 'next'
import getWithMDX from '@next/mdx'
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
import { findModuleRoot } from '../../lib/findModuleRoot'
import { getBuildNumber } from '../../lib/getBuildNumber'
import { getBuildUrl } from '../../lib/getBuildUrl'
import { getDomain } from '../../lib/getDomain'
import { getGitBranch } from '../../lib/getGitBranch'
import { getGitCommitHash } from '../../lib/getGitCommitHash'
import { getenv } from '../../lib/getenv'

const { pkg, moduleRoot } = findModuleRoot()

const PRODUCTION = process.env.NODE_ENV === 'production'
const DOMAIN = getDomain()
const DOMAIN_STRIPPED = DOMAIN.replace('https://', '').replace('http://', '')
const DATA_FULL_DOMAIN = getenv('DATA_FULL_DOMAIN')
const DATA_TRY_GITHUB_BRANCH = getenv('DATA_TRY_GITHUB_BRANCH')

const env = {
  DOMAIN,
  DOMAIN_STRIPPED,
  DATA_FULL_DOMAIN,
  DATA_TRY_GITHUB_BRANCH,
  PACKAGE_NAME: pkg.name,
  PACKAGE_VERSION: pkg.version,
}

const appJson = {
  name: pkg.name,
  version: pkg.version,
  branchName: getGitBranch(),
  commitHash: getGitCommitHash(),
  buildNumber: getBuildNumber(),
  buildUrl: getBuildUrl(),
  domain: DOMAIN,
  domainStripped: DOMAIN_STRIPPED,
  dataFullDomain: DATA_FULL_DOMAIN,
  blockSearchIndexing: DOMAIN === RELEASE_URL ? '0' : '1',
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
    mdxRs: true,
    scrollRestoration: true,
    swcPlugins: [],
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
  transpilePackages: ['auspice', 'semver'],
  env,
}

const withExternals = getWithExternals({ externals: ['canvas'] })

const withMDX = getWithMDX({
  extension: /\.mdx?$/,
  options: {},
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

const withAppJson = getWithEmitFile({
  path: PRODUCTION ? '.' : 'static/',
  filename: 'app.json',
  content: JSON.stringify(appJson, null, 2),
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
].filter(Boolean)

export default () => plugins.reduce((acc, next) => next(acc), nextConfig)
