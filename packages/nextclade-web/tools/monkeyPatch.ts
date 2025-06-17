/* eslint-disable no-template-curly-in-string,sonarjs/no-duplicate-string */

/**
 *
 * This dangerously and unreliably patches some of the node_modules. Mostly cosmetic stuff.
 * Do not use this to fix bugs or introduce features. Consider contributing to the upstream project instead.
 *
 */
import { uniq } from 'lodash'
import { concurrent, serial } from 'fasy'
import { readFile, readJson, rm, writeFile, writeJson } from 'fs-extra'
import { globby } from 'globby'

export async function replace(filename: string, searchValue: string | RegExp, replaceValue = '') {
  const content = await readFile(filename, 'utf8')
  const newContent = content.replace(searchValue, replaceValue)
  await writeFile(filename, newContent, { encoding: 'utf8' })
}

/** Strips timerStart() and timerEnd() calls from Auspice */
export async function removeAuspiceTimers() {
  await rm('node_modules/auspice/src/util/perf.js', { force: true })

  const files = await globby('node_modules/auspice/src/**/*.js')

  await serial.forEach(async (file: string) => {
    await replace(file, /.*(timerStart|timerEnd)\(".+"\);.*\n/g, '')
    await replace(file, /.*import { timerStart, timerEnd }.*\n/g, '')
  }, files)
}

export async function removeJotaiDevtoolsWarnings() {
  const files = await globby('node_modules/jotai-devtools/dist/**/*.js')

  await serial.forEach(async (file: string) => {
    await replace(file, /console\.warn\(.*?\);/gs, '')
  }, files)
}

async function removeConsoleHmrMessages() {
  const filesToPatch = await globby(
    [
      'node_modules/next/dist/**/*.js',
      'node_modules/webpack-hot-middleware/*.js',
      'node_modules/webpack/hot/*.js',
      'node_modules/webpack/lib/hmr/*.js',
    ],
    {
      onlyFiles: true,
      ignore: ['**/*.map', '**/*.d.ts'],
    },
  )
  await concurrent.forEach(async (file: string) => {
    await replace(
      file,
      /(window\.)?console\.(log|warn|error)\((.*?)(\[HMR\]|\[Fast Refresh\]|Refreshing page data)(.*?)\);/g,
      '',
    )
    // await replace(file, /(\[HMR\]|\[Fast Refresh\]|Refreshing page data)/g, '')
  }, uniq(filesToPatch))
}

export async function main() {
  await Promise.all([
    // Removes warning "<title> should not be used in _document.js".
    // Reason: We want title and other SEO tags to be pre-rendered, so that crawlers could find them.
    replace(
      'node_modules/next/dist/pages/_document.js',
      `console.warn("Warning: <title> should not be used in _document.js's <Head>. https://nextjs.org/docs/messages/no-document-title");`,
    ),

    replace(
      'node_modules/next/dist/build/index.js',
      "`${Log.prefixes.info} ${ignoreTypeScriptErrors ? 'Skipping validation of types' : 'Checking validity of types'}`",
      '""',
    ),

    // Removes reminder about upgrading caniuse database. Nice, but not that important. Will be handled along with
    // routine package updates.
    // Reason: too noisy
    replace(
      'node_modules/next/dist/compiled/browserslist/index.js',
      'console.warn("Browserslist: caniuse-lite is outdated. Please run:\\n"+"  npx update-browserslist-db@latest\\n"+"  Why you should do it regularly: "+"https://github.com/browserslist/update-db#readme")',
      '',
    ),

    replace(
      'node_modules/next/dist/server/base-server.js',
      'Log.warn(`You have added a custom /_error page without a custom /404 page. This prevents the 404 page from being auto statically optimized.\\nSee here for info: https://nextjs.org/docs/messages/custom-error-no-custom-404`);',
    ),

    removeConsoleHmrMessages(),
    removeAuspiceTimers(),
    removeJotaiDevtoolsWarnings(),
  ])

  // More useless messages from Next.js
  await replace('node_modules/next/dist/server/config.js', 'console.warn();')
  await replace(
    'node_modules/next/dist/server/config.js',
    "Log.warn('SWC minify release candidate enabled. https://nextjs.org/docs/messages/swc-minify-enabled');",
  )
  await replace(
    'node_modules/next/dist/server/config.js',
    "Log.warn(_chalk.default.bold('You have enabled experimental feature(s).'));",
  )
  await replace(
    'node_modules/next/dist/server/config.js',
    'Log.warn(`Experimental features are not covered by semver, and may cause unexpected or broken application behavior. ` + `Use them at your own risk.`);',
  )
  await replace(
    'node_modules/next/dist/build/webpack-config.js',
    "Log.info(`automatically enabled Fast Refresh for ${injections} custom loader${injections > 1 ? 's' : ''}`);",
  )
  await replace('node_modules/@next/env/dist/index.js', 'n.info(`Loaded env from ${t.join(r||"",_.path)}`)')
  await replace('node_modules/next/dist/build/output/store.js', "Log.wait('compiling...');")
  await replace('node_modules/next/dist/build/output/store.js', 'Log.wait(`compiling ${state.trigger}...`);')
  await replace(
    'node_modules/next/dist/build/output/store.js',
    'Log.info(`bundled${partialMessage} successfully${timeMessage}${modulesMessage}, waiting for typecheck results...`);',
  )
  await replace(
    'node_modules/next/dist/build/output/store.js',
    'Log.event(`compiled${partialMessage} successfully${timeMessage}${modulesMessage}`);',
  )

  // From fork-ts-checker-webpack-plugin
  await replace(
    'node_modules/fork-ts-checker-webpack-plugin/lib/hooks/tap-done-to-async-get-issues.js',
    "config.logger.log(chalk_1.default.cyan('Type-checking in progress...'));",
  )

  // Auspice: Remove requires for '@extensions' modules from `extensions.js`
  // Reason: We don't use extensions and don't want to setup webpack aliases for that.
  await replace(
    'node_modules/auspice/src/util/extensions.ts',
    'extensions[key] = require(`@extensions/${extensions[key]}`).default;',
  )
}

main().catch(console.error)
