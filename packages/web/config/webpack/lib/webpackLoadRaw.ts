export interface WebpackLoadRawParams {
  patterns: RegExp
}

export default function webpackLoadRaw({ patterns }: WebpackLoadRawParams) {
  return [
    {
      test: patterns,
      use: [
        {
          loader: 'raw-loader',
        },
      ],
    },
  ]
}
