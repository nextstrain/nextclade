import { get, set } from 'lodash'

import type { NextConfig } from 'next'
import { addWebpackConfig } from './lib/addWebpackConfig'

export default function withLimitTerserParallelism(nextConfig: NextConfig) {
  return addWebpackConfig(nextConfig, (nextConfig, webpackConfig, options) => {
    const newMinimizer = webpackConfig.optimization?.minimizer?.map((minimizer) => {
      const minimizerName = get(minimizer, 'constructor.name')
      if (minimizerName === 'TerserPlugin') {
        set(minimizer, 'options.parallel', 4)
      }
      return minimizer
    })

    set(webpackConfig, 'optimization.minimizer', newMinimizer)

    return webpackConfig
  })
}
