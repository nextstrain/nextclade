import type { NextConfig } from 'next'
import LodashWebpackPlugin, { Options } from 'lodash-webpack-plugin'

import { addWebpackPlugin } from './lib/addWebpackPlugin'

const withLodash = (options: Options) => (nextConfig: NextConfig) => {
  return addWebpackPlugin(
    nextConfig,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new LodashWebpackPlugin({
      caching: true,
      chaining: true,
      cloning: true,
      coercions: true,
      collections: true,
      currying: true,
      deburring: true,
      exotics: true,
      flattening: true,
      guards: true,
      memoizing: true,
      metadata: true,
      paths: true,
      placeholders: true,
      shorthands: true,
      unicode: true,
      ...options,
    }),
  )
}

export default withLodash
