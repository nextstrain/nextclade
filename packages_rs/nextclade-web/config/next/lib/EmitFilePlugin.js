/* eslint-disable import/newline-after-import,@typescript-eslint/no-use-before-define,func-names,prefer-destructuring,no-promise-executor-return,@typescript-eslint/no-floating-promises,promise/always-return,promise/catch-or-return,import/no-extraneous-dependencies */
// Taken from https://github.com/Kir-Antipov/emit-file-webpack-plugin/blob/a17e94f434c9185d659e18806d49f3c6bc73d706/index.js

/**
 * @author Kir_Antipov
 * See LICENSE.md file in root directory for full license.
 */

const { Buffer } = require('buffer')
const path = require('path')
const webpack = require('webpack')
const version = +webpack.version.split('.')[0]
// Webpack 5 exposes the sources property to ensure the right version of webpack-sources is used.
// require('webpack-sources') approach may result in the "Cannot find module 'webpack-sources'" error.
const { Source, RawSource } = webpack.sources || require('webpack-sources')

/**
 * Webpack plugin to emit files.
 *
 * @param {EmitFilePluginOptions} options The EmitFilePlugin config.
 */
function EmitFilePlugin(options) {
  if (!options) {
    throw new Error(`${EmitFilePlugin.name}: Please provide 'options' for the ${EmitFilePlugin.name} config.`)
  }

  if (!options.filename) {
    throw new Error(`${EmitFilePlugin.name}: Please provide 'options.filename' in the ${EmitFilePlugin.name} config.`)
  }

  if (!options.content && options.content !== '') {
    throw new Error(`${EmitFilePlugin.name}: Please provide 'options.content' in the ${EmitFilePlugin.name} config.`)
  }

  if (typeof options.stage == 'number' && version < 5) {
    console.warn(`${EmitFilePlugin.name}: 'options.stage' is only available for Webpack version 5 and higher.`)
  }

  this.options = options
}

/**
 * Plugin entry point.
 *
 * @param {webpack.Compiler} compiler The compiler.
 */
EmitFilePlugin.prototype.apply = function (compiler) {
  if (version < 4) {
    compiler.plugin('emit', (compilation, callback) => emitFile(this.options, compilation, callback))
  } else if (version === 4) {
    compiler.hooks.emit.tapAsync(EmitFilePlugin.name, (compilation, callback) =>
      emitFile(this.options, compilation, callback),
    )
  } else {
    compiler.hooks.thisCompilation.tap(EmitFilePlugin.name, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: EmitFilePlugin.name,
          stage:
            typeof this.options.stage == 'number'
              ? this.options.stage
              : webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => new Promise((resolve) => emitFile(this.options, compilation, resolve)),
      )
    })
  }
}

/**
 * @param {EmitFilePluginOptions} options
 * @param {webpack.Compilation} compilation
 * @param {() => void} resolve
 */
function emitFile(options, compilation, resolve) {
  const outputPath = options.path || compilation.options.output.path

  let filename = options.filename

  if (options.hash) {
    const hash = compilation.hash || ''
    if (filename.includes('[hash]')) {
      filename = filename.replace('[hash]', hash)
    } else if (hash) {
      filename = `${filename}?${hash}`
    }
  }

  const outputPathAndFilename = path.resolve(compilation.options.output.path, outputPath, filename)

  const relativeOutputPath = path.relative(compilation.options.output.path, outputPathAndFilename)

  const contentOrPromise = typeof options.content == 'function' ? options.content(compilation.assets) : options.content

  const contentPromise =
    contentOrPromise instanceof Promise ? contentOrPromise : new Promise((resolve) => resolve(contentOrPromise))

  contentPromise.then((content) => {
    const source =
      content instanceof Source
        ? content
        : new RawSource(typeof content == 'string' || content instanceof Buffer ? content : JSON.stringify(content))

    if (version < 5) {
      compilation.assets[relativeOutputPath] = source
    } else {
      compilation.emitAsset(relativeOutputPath, source)
    }

    resolve()
  })
}

module.exports = EmitFilePlugin
