declare module 'next-transpile-modules' {
  export declare interface NextTranspileModulesOptions {
    // eslint-disable-next-line camelcase
    unstable_webpack5?: boolean
  }

  export default function getWithTranspileModules(
    transpiledModules?: (RegExp | string)[],
    options?: NextTranspileModulesOptions,
  )
}
