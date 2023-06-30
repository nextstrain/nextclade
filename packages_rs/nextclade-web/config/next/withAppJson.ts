import { NextConfig } from 'next'
import type { AppJson } from 'src/components/Layout/UpdateNotification'
import { addWebpackPlugin } from './lib/addWebpackPlugin'
import EmitFilePlugin from './lib/EmitFilePlugin'
import { getEnvVars } from './lib/getEnvVars'

const { PRODUCTION } = getEnvVars()

export const getWithAppJson = (json: AppJson) => (nextConfig: NextConfig) => {
  return addWebpackPlugin(
    nextConfig,
    new EmitFilePlugin({
      path: PRODUCTION ? '.' : 'static/',
      filename: 'app.json',
      content: JSON.stringify(json, null, 2),
      hash: false,
    }),
  )
}
