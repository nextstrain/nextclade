import type { NextConfig } from 'next'
import { addWebpackConfig } from './lib/addWebpackConfig'

// See: https://react-svgr.com/docs/next/
export default function withSvg(_: NextConfig) {
  return addWebpackConfig(_, (_nextConfig, config, _options) => {
    // Grab the existing rule that handles SVG imports
    // @ts-ignore
    const fileLoaderRule = config.module?.rules?.find((rule) => rule?.test?.test?.('.svg'))

    config.module?.rules?.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        // @ts-ignore
        ...(fileLoaderRule ?? {}),
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        // @ts-ignore
        issuer: fileLoaderRule?.issuer,
        // @ts-ignore
        resourceQuery: { not: [...(fileLoaderRule?.resourceQuery?.not ?? {}), /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      },
    )

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    // @ts-ignore
    fileLoaderRule.exclude = /\.svg$/i

    return config
  })
}
