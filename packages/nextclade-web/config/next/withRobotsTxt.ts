import { NextConfig } from 'next'
import { addWebpackPlugin } from './lib/addWebpackPlugin'
import EmitFilePlugin from './lib/EmitFilePlugin'
import { getEnvVars } from './lib/getEnvVars'

const { PRODUCTION } = getEnvVars()

export const getWithRobotsTxt = (content: string) => (nextConfig: NextConfig) => {
  return addWebpackPlugin(
    nextConfig,
    new EmitFilePlugin({
      path: PRODUCTION ? '.' : 'static/',
      filename: 'robots.txt',
      content,
      hash: false,
    }),
  )
}
