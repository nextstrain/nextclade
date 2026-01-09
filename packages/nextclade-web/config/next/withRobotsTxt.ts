import process from 'node:process'
import { NextConfig } from 'next'
import { addWebpackPlugin } from './lib/addWebpackPlugin'
import { EmitFilePlugin } from './lib/EmitFilePlugin'

const PRODUCTION = process.env.NODE_ENV === 'production'

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
