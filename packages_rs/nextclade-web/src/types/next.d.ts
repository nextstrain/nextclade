import { WebpackEntrypoints } from 'next/dist/build/entries'
import { WebpackOptions } from 'webpack/declarations/WebpackOptions'

export * from 'next/types/global'
export * from 'next/types/index'
export type { NextConfig } from 'next/dist/server/config-shared'

export interface NextWebpackOptions {
  buildId: string
  config: any
  dev?: boolean
  isServer?: boolean
  pagesDir: string
  target?: string
  tracer?: any
  entrypoints: WebpackEntrypoints
}

export type WebpackFunction = (webpackConfig: WebpackOptions, options: NextWebpackOptions) => WebpackOptions

export type Target = 'server' | 'serverless' | 'experimental-serverless-trace'

export type ReactMode = 'legacy' | 'blocking' | 'concurrent'

export type SassOptions = object

export type ServerRuntimeConfig = object

export type PublicRuntimeConfig = object
