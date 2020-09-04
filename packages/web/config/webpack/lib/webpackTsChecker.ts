import path from 'path'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'

import { findModuleRoot } from '../../../lib/findModuleRoot'
import tsConfig from '../../../tsconfig.json'

const { moduleRoot } = findModuleRoot()

export interface WebpackTsCheckerOptions {
  eslint: boolean
  typeChecking: boolean
  memoryLimit?: number
  exclude?: string[]
}

export default function webpackTsChecker({
  eslint,
  typeChecking,
  memoryLimit = 512,
  exclude,
}: WebpackTsCheckerOptions) {
  if (!typeChecking && !eslint) {
    return undefined
  }

  return new ForkTsCheckerWebpackPlugin({
    issue: {
      exclude: exclude?.map((file) => ({ origin: 'typescript', file })),
    },

    typescript: {
      enabled: typeChecking,
      configFile: path.join(moduleRoot, 'tsconfig.json'),
      memoryLimit,
      mode: 'write-references',
      diagnosticOptions: { syntactic: true, semantic: true, declaration: true, global: true },
      configOverwrite: {
        compilerOptions: {
          ...tsConfig.compilerOptions,
          skipLibCheck: true,
          sourceMap: false,
          inlineSourceMap: false,
          declarationMap: false,
        },
        include: [
          'lib/**/*.js',
          'lib/**/*.jsx',
          'lib/**/*.ts',
          'lib/**/*.tsx',
          'src/**/*.js',
          'src/**/*.jsx',
          'src/**/*.ts',
          'src/**/*.tsx',
        ],
        exclude: [...tsConfig.exclude, ...(exclude ?? [])],
      },
    },

    eslint: {
      enabled: eslint,
      memoryLimit,
      files: [path.join(moduleRoot, 'src/**/*.{js,jsx,ts,tsx}')],
      options: { cache: false },
    },

    formatter: 'codeframe',
  })
}
