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
  return addWebpackPlugin(
    nextConfig,
    new ForkTsCheckerWebpackPlugin({
      typescript: typeChecking
        ? {
            memoryLimit,
            mode: 'write-references',
            diagnosticOptions: {
              declaration: true,
              global: true,
              semantic: true,
              syntactic: true,
            },
            profile: true,
          }
        : undefined,

      eslint: eslint
        ? {
            enabled: true,
            memoryLimit,
            files: ['**/*.{js,jsx,ts,tsx}'],
          }
        : undefined,

      formatter: 'codeframe',
    }),
  )
}

export default getWithTypeChecking
