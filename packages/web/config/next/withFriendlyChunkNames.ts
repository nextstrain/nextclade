import { unset } from 'lodash'

import type { NextConfig } from 'next'
import { addWebpackConfig } from './lib/addWebpackConfig'

export default function withFriendlyChunkNames(nextConfig: NextConfig) {
  return addWebpackConfig(nextConfig, (nextConfig, webpackConfig, options) => {
    if (
      typeof webpackConfig.optimization?.splitChunks !== 'boolean' &&
      webpackConfig.optimization?.splitChunks?.cacheGroups
    ) {
      console.log(
        require('util').inspect({ splitChunks: webpackConfig.optimization.splitChunks }, { colors: true, depth: null }),
      )

      unset(webpackConfig, 'optimization.splitChunks.cacheGroups.lib.name')
      unset(webpackConfig, 'optimization.splitChunks.cacheGroups.shared.name')
    }
    return webpackConfig
  })
}
