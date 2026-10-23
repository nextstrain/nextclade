import type { Plugin } from 'vite'
import { transformWithOxc } from 'vite'

/** Source modules of the Auspice package, which the app imports directly (`auspice/src/...`) */
const AUSPICE_SOURCE = /[/\\]node_modules[/\\]auspice[/\\]src[/\\][^?]+\.js(?:\?.*)?$/

/**
 * Let tests import Auspice source modules, as the webpack build of the app does (see `config/next/withResolve.ts`):
 * Auspice writes JSX in `.js` files and uses legacy decorators (`@connect`), which Node cannot load as they are
 */
export function auspice(): Plugin {
  return {
    name: 'nextclade-auspice',
    enforce: 'pre',
    async transform(code, id) {
      if (!AUSPICE_SOURCE.test(id)) {
        return undefined
      }
      const result = await transformWithOxc(code, id, {
        lang: 'jsx',
        jsx: { runtime: 'automatic' },
        decorator: { legacy: true },
        sourcemap: true,
      })
      return { code: result.code, map: result.map ?? null }
    },
  }
}
