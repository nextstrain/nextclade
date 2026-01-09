import type { NextConfig } from 'next'
import path from 'path'
import { addWebpackConfig } from './lib/addWebpackConfig'

export default function withResolve(nextConfig: NextConfig) {
  return addWebpackConfig(nextConfig, (nextConfig, webpackConfig) => {
    webpackConfig.resolve = {
      ...webpackConfig.resolve,
      modules: [...(webpackConfig.resolve?.modules ?? []), path.resolve('src'), path.resolve('node_modules')],
    }

    return webpackConfig
  })
}
