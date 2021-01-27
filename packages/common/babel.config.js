require('./config/dotenv')

const development = process.env.NODE_ENV === 'development'
const production = process.env.NODE_ENV === 'production'
const analyze = process.env.ANALYZE === '1'
const debuggableProd = process.env.DEBUGGABLE_PROD === '1'

module.exports = (api) => {
  const test = api.caller((caller) => !!(caller && caller.name === 'babel-jest'))
  const node = api.caller((caller) => !!(caller && ['@babel/node', '@babel/register'].includes(caller.name)))
  const web = !(test || node)

  return {
    compact: false,
    presets: [
      '@babel/preset-typescript',
      [
        '@babel/preset-env',
        {
          corejs: false,
          modules: 'commonjs',
          shippedProposals: true,
          targets: { node: '12' },
          exclude: ['transform-typeof-symbol'],
        },
      ],
    ],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }], // goes before
      // "class-properties"
      ['@babel/plugin-proposal-class-properties'],
      ['@babel/plugin-proposal-numeric-separator'],
    ].filter(Boolean),
  }
}
