import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'

import { NextConfig } from '../../src/types/next'

import { addWebpackPlugin } from './lib/addWebpackPlugin'

export interface CreateFormatterParams {
  warningsAreErrors: boolean
}

export interface GetWithTypeCheckingParams {
  eslint: boolean
  typeChecking: boolean
  memoryLimit?: number
}

const getWithTypeChecking = ({ eslint, typeChecking, memoryLimit = 512 }: GetWithTypeCheckingParams) => (
  nextConfig: NextConfig,
) => {
  if (!typeChecking && !eslint) {
    return nextConfig
  }

  return addWebpackPlugin(
    nextConfig,
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        enabled: typeChecking,
        memoryLimit,
        mode: 'write-references',
        diagnosticOptions: {
          declaration: true,
          global: true,
          semantic: true,
          syntactic: true,
        },
      },

      eslint: {
        enabled: eslint,
        memoryLimit,
        files: ['**/*.{js,jsx,ts,tsx}'],
        options: { cache: false },
      },

      formatter: 'codeframe',
    }),
  )
}

export default getWithTypeChecking
