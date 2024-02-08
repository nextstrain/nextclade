import type { NextConfig } from 'next'

import { addWebpackLoader } from './lib/addWebpackLoader'

export default function withRaw(nextConfig: NextConfig) {
  return addWebpackLoader(nextConfig, (_webpackConfig, _context) => ({
    test: /\.(txt|fasta|gff|csv|tsv)$/i,
    type: 'asset/source',
  }))
}
