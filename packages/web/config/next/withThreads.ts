import type { NextConfig } from 'next'
import ThreadsPlugin from 'threads-plugin'

import { addWebpackPlugin } from './lib/addWebpackPlugin'

export default function withWorker(nextConfig: NextConfig) {
  return addWebpackPlugin(nextConfig, new ThreadsPlugin({ globalObject: 'self' }))
}
