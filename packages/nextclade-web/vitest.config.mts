import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { auspice } from './config/vitest/auspice'

export default defineConfig({
  plugins: [auspice()],
  resolve: {
    alias: {
      src: fileURLToPath(new URL('src', import.meta.url)),
      // Auspice reads its extensions from this module, as in the webpack build (see `config/next/withResolve.ts`)
      '@extensions': fileURLToPath(new URL('src/components/Tree/auspiceExtensions.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        // Transform the Auspice sources with the plugin above, instead of loading them with Node
        inline: [/[/\\]node_modules[/\\]auspice[/\\]/],
      },
    },
  },
})
