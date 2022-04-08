// @ts-check

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  webpack(config) {
    config.experiments = { ...(config.experiments ?? {}), asyncWebAssembly: true }
    config.plugins = [...config.plugins]

    config.module.rules.push({
      test: /\.(txt|fasta|gff|csv|tsv)/,
      type: 'asset/source',
    })

    return config
  },
}
