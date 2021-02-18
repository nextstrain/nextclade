import { NextConfig, NextWebpackOptions } from 'next'
import { Configuration } from 'webpack'

export type CustomWebpackConfig = (
  nextConfig: NextConfig,
  webpackConfig: Configuration,
  options: NextWebpackOptions,
) => Configuration
