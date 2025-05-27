import ESLintPlugin from 'eslint-webpack-plugin'
import type { NextConfig } from 'next'
import { addWebpackPlugin } from './lib/addWebpackPlugin'

export interface GetWithEslintParams {
  eslint: boolean
  exclude?: string[]
}

const getWithEslint =
  ({ eslint, exclude = ['node_modules'] }: GetWithEslintParams) =>
  (nextConfig: NextConfig) => {
    if (!eslint) {
      return nextConfig
    }

    return addWebpackPlugin(
      nextConfig,

      new ESLintPlugin({
        configType: 'flat',
        cache: false,
        cacheLocation: '.cache',
        exclude,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.cts', '.mts'],
        failOnError: false,
        failOnWarning: false,
        formatter: 'friendly',
        threads: 4,
      }),
    )
  }

export default getWithEslint
