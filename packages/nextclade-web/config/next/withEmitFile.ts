import { NextConfig } from 'next'
import { addWebpackPlugin } from './lib/addWebpackPlugin'
import { EmitFilePlugin, EmitFilePluginOptions } from './lib/EmitFilePlugin'

export const getWithEmitFile = (options: EmitFilePluginOptions) => (nextConfig: NextConfig) => {
  return addWebpackPlugin(nextConfig, new EmitFilePlugin(options))
}
