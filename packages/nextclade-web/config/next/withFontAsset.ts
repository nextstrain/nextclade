import type { NextConfig } from 'next'
import { addWebpackLoader } from './lib/addWebpackLoader'

/**
 * Emit font files that JavaScript modules import, as Auspice's SVG download does to embed the font it renders with,
 * and resolve the import to the URL of the emitted file. Font files referenced from stylesheets keep the loader of the
 * stylesheets.
 */
export default function withFontAsset(nextConfig: NextConfig) {
  return addWebpackLoader(nextConfig, (_webpackConfig, _context) => ({
    test: /\.woff2?$/,
    issuer: /\.[cm]?[jt]sx?$/,
    type: 'asset/resource',
  }))
}
