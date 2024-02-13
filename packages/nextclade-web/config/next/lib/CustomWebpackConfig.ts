import type { NextConfig, WebpackConfigContext } from 'next'
import type { Configuration } from 'webpack'

export type CustomWebpackConfig = (
  nextConfig: NextConfig,
  webpackConfig: Configuration,
  options: WebpackConfigContext,
) => Configuration
