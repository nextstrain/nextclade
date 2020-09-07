import { MinifyOptions } from 'terser'

import TerserPlugin from 'terser-webpack-plugin'

export interface WebpackTerserParams {
  sourceMaps: boolean
  node: boolean
  profile: boolean
}

export default function webpackTerser({ sourceMaps, node, profile = false }: WebpackTerserParams) {
  const minify: MinifyOptions = {
    parse: {
      ecma: 2020,
    },
    compress: {
      defaults: true,
      ecma: 5,
      comparisons: false,
      inline: 2,
    },
    mangle: {
      safari10: true,
    },
    format: {
      ecma: 5,
      comments: false,
      ascii_only: true,
    },
    ie8: false,
    safari10: true,
    keep_classnames: profile,
    keep_fnames: profile,
    sourceMap: sourceMaps,
  }

  const beautify: MinifyOptions = {
    ...minify,
    compress: false,
    mangle: false,
    format: {
      ...minify.format,
      ecma: 5,
      braces: true,
      semicolons: true,
      beautify: true,
    },
    ie8: false,
    safari10: false,
    keep_classnames: true,
    keep_fnames: true,
  }

  return new TerserPlugin({
    terserOptions: node ? beautify : minify,
    parallel: true,
    cache: true,
    extractComments: false,
    sourceMap: sourceMaps,
  })
}
