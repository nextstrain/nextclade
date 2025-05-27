import type { NextConfig } from 'next'
import type { WebpackConfigContext } from 'next/dist/server/config-shared'
import { Configuration, WebpackPluginInstance } from 'webpack'
import { addWebpackConfig } from './addWebpackConfig'

export function addWebpackPlugin(nextConfig: NextConfig, plugin: unknown) {
  return addWebpackConfig(
    nextConfig,
    (_: NextConfig, webpackConfig: Configuration, { isServer }: WebpackConfigContext) => {
      if (!isServer) {
        if (webpackConfig.plugins) {
          webpackConfig.plugins.push(plugin as WebpackPluginInstance)
        } else {
          return { plugins: [plugin as WebpackPluginInstance] }
        }
      }
      return webpackConfig
    },
  )
}
