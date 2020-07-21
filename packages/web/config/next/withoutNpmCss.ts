import webpack from 'webpack'
import type { NextConfig } from 'next'

import { addWebpackPlugin } from './lib/addWebpackPlugin'

export default function withoutNpmCss(nextConfig: NextConfig) {
  let nextConfigNew = nextConfig
  nextConfigNew = addWebpackPlugin(
    nextConfigNew,

    new webpack.ContextReplacementPlugin(/.*/, (context) => {
      console.log({ context })
    }),
  )

  nextConfigNew = addWebpackPlugin(
    nextConfigNew,
    new webpack.IgnorePlugin({
      checkResource: (resource: string) => {
        return (
          resource.endsWith('awesomplete.css') ||
          resource.includes('core-js/library') ||
          resource.includes('babel-runtime')
        )
      },
    }),
  )

  return nextConfigNew
}
