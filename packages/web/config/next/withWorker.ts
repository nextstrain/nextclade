import type { NextConfig } from 'next'

import { addWebpackLoader } from './lib/addWebpackLoader'

export default function withWorker(nextConfig: NextConfig) {
  return addWebpackLoader(nextConfig, (webpackConfig, { dev, isServer }) => ({
    test: /\^worker\.(.*)\.[jt]s$/,
    use: { loader: 'worker-loader' },
  }))
}
