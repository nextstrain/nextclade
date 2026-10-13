import type { NextConfig } from 'next'
import path from 'path'
import { addWebpackConfig } from './lib/addWebpackConfig'

export default function withResolve(nextConfig: NextConfig) {
  return addWebpackConfig(nextConfig, (nextConfig, webpackConfig) => {
    webpackConfig.resolve = {
      ...webpackConfig.resolve,
      modules: [...(webpackConfig.resolve?.modules ?? []), path.resolve('src'), path.resolve('node_modules')],
      alias: {
        ...webpackConfig.resolve?.alias,
        'react-redux': path.resolve('node_modules/react-redux'),
        'redux': path.resolve('node_modules/redux'),
        'redux-thunk': path.resolve('node_modules/redux-thunk'),
      },
    }

    // Auspice declares itself an ES module package, so webpack would treat its sources as strict ES modules: imports
    // would need file extensions, which the sources omit, and default imports of CommonJS packages (such as
    // `styled-components`) would receive the whole module object. Auspice's own webpack configuration treats its
    // sources the same way as here.
    webpackConfig.module?.rules?.push({
      test: /\.(ts|js)x?$/,
      include: /[/\\]node_modules[/\\]auspice[/\\]/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    })

    return webpackConfig
  })
}
