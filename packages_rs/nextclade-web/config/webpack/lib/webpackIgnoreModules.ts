export interface WebpackIgnoreModulesParams {
  patterns: RegExp
}

export default function webpackIgnoreModules({ patterns }: WebpackIgnoreModulesParams) {
  return [
    {
      test: patterns,
      use: [
        {
          loader: 'null-loader',
        },
      ],
    },
  ]
}
