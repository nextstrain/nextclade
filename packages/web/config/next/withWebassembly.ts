import { set } from 'lodash'

import type { NextConfig } from 'next'
import { addWebpackConfig } from './lib/addWebpackConfig'
import { addWebpackLoader } from './lib/addWebpackLoader'

export default function withWebassembly(nextConfig: NextConfig) {
  let cfg = addWebpackConfig(nextConfig, (nextConfig, webpackConfig, options) => {
    set(webpackConfig, 'experiments.asyncWebAssembly', true)
    set(webpackConfig, 'experiments.topLevelAwait', true)

    set(webpackConfig, 'resolve.alias', {
      ...(webpackConfig?.resolve?.alias ?? {}),
      fs: '3rdparty/__empty-module',
    })

    return webpackConfig
  })

  cfg = addWebpackLoader(cfg, (webpackConfig, { dev, isServer }) => ({
    test: /\.wasm$/,
    type: 'javascript/auto',
    // type: 'webassembly/async',
    use: [
      {
        loader: 'source-map-loader',
      },
      {
        loader: 'file-loader',
        options: {
          name: dev ? '[name].[ext]' : '[name].[hash:7].[ext]',
          publicPath: `${nextConfig.assetPrefix}/_next/static/wasm/`,
          outputPath: `${isServer ? '../' : ''}static/wasm/`,
        },
      },
    ],
  }))

  // cfg = addWebpackLoader(cfg, (webpackConfig, { dev }) => ({
  //   test: /\.webassembly\.js$/,
  //   loader: 'exports-loader',
  //   options: {
  //     exports: ['entry'],
  //   },
  // }))

  return cfg
}
