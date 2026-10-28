import type { NextConfig } from 'next'
import path from 'path'
import { addWebpackConfig } from './lib/addWebpackConfig'

export interface WithEditedPackagesOptions {
  /** Names of the packages in `node_modules` whose files change without a change of their version */
  packages: string[]
  /** Scripts that edit the files of installed packages */
  editors: string[]
}

/**
 * Keep the persistent webpack cache in step with edits of installed packages.
 *
 * Next.js declares all of `node_modules` as managed paths, so webpack identifies each package there only by the name
 * and the version in its `package.json`. A patched package keeps its version when its patch changes, and the cache
 * would then keep serving the modules built from the previous patch. Webpack checks the files of the given packages
 * by content instead, and a change of an editor script invalidates the cache.
 */
const getWithEditedPackages =
  ({ packages, editors }: WithEditedPackagesOptions) =>
  (nextConfig: NextConfig) => {
    return addWebpackConfig(nextConfig, (nextConfig, webpackConfig) => {
      webpackConfig.snapshot = {
        ...webpackConfig.snapshot,
        unmanagedPaths: [
          ...(webpackConfig.snapshot?.unmanagedPaths ?? []),
          ...packages.map((name) => path.resolve('node_modules', name)),
        ],
      }

      if (typeof webpackConfig.cache === 'object' && webpackConfig.cache.type === 'filesystem') {
        webpackConfig.cache = {
          ...webpackConfig.cache,
          buildDependencies: {
            ...webpackConfig.cache.buildDependencies,
            editors: editors.map((file) => path.resolve(file)),
          },
          // Cache entries written while these packages were managed hold snapshots by version only, so they cannot be
          // trusted after a change of the list
          version: `${webpackConfig.cache.version ?? ''}|unmanaged:${packages.join(',')}`,
        }
      }

      return webpackConfig
    })
  }

/** Return the names of the packages that `patchedDependencies` of `package.json` patches */
export function getPatchedPackageNames(patchedDependencies: Record<string, string> | undefined): string[] {
  // Keys are `<name>@<version>` or `<name>`, and the name of a scoped package starts with `@` too
  return Object.keys(patchedDependencies ?? {}).map((key) => {
    const versionStart = key.lastIndexOf('@')
    return versionStart > 0 ? key.slice(0, versionStart) : key
  })
}

export default getWithEditedPackages
