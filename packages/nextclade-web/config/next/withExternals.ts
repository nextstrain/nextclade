import type { NextConfig } from 'next'
import { addWebpackConfig } from './lib/addWebpackConfig'

export interface GetWithExternalsOptions {
  externals?: string[]
}

const getWithExternals = (options: GetWithExternalsOptions) => (nextConfig: NextConfig) => {
  const externalObjects = options.externals?.map((external) => ({ [external]: external })) ?? []
  return addWebpackConfig(nextConfig, (_nextConfig, webpackConfig, _options) => {
    // @ts-ignore
    webpackConfig.externals = [...(webpackConfig.externals ?? []), ...externalObjects] // eslint-disable-line @typescript-eslint/no-misused-spread
    return webpackConfig
  })
}

export default getWithExternals
