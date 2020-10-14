import type { NextWebpackOptions, NextConfig } from 'next'
import type { Configuration, WebpackPluginFunction, WebpackPluginInstance } from 'webpack'

import { addWebpackConfig } from './addWebpackConfig'

export function addWebpackPlugin(nextConfig: NextConfig, plugin: WebpackPluginInstance | WebpackPluginFunction) {
  return addWebpackConfig(
    nextConfig,
    (nextConfig: NextConfig, webpackConfig: Configuration, { isServer }: NextWebpackOptions) => {
      if (!isServer) {
        if (webpackConfig?.plugins) {
          webpackConfig.plugins.push(plugin)
        } else {
          return { plugins: [plugin] }
        }
      }
      return webpackConfig
    },
  )
}
