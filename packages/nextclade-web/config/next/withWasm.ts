import { set } from 'lodash'
import type { NextConfig } from 'next'
import { addWebpackConfig } from './lib/addWebpackConfig'

export default function withWasm(nextConfig: NextConfig) {
  return addWebpackConfig(nextConfig, (nextConfig, webpackConfig) => {
    set(webpackConfig, 'experiments.asyncWebAssembly', true)
    set(webpackConfig, 'output.environment.asyncFunction', true)
    return webpackConfig
  })
}
