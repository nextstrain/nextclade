//* Taken with modifications from
//* https://github.com/Kir-Antipov/emit-file-webpack-plugin/blob/a17e94f434c9185d659e18806d49f3c6bc73d706/index.js
//*
//* @author Kir_Antipov
//* See LICENSE.md file in root directory for full license.
//*
import { Buffer } from 'node:buffer'
import path from 'node:path'
import { isEmpty } from 'lodash'
import webpack, { Compilation } from 'webpack'

export interface EmitFilePluginOptions {
  filename: string
  content: string | Buffer | ((assets: unknown) => string | Buffer | Promise<string | Buffer>)
  path?: string
  hash?: boolean
  stage?: number
}

export class EmitFilePlugin {
  private options: EmitFilePluginOptions

  constructor(options?: EmitFilePluginOptions) {
    if (!options) {
      throw new Error('EmitFilePlugin: Please provide "options" for the EmitFilePlugin config.')
    }
    if (!options.filename) {
      throw new Error('EmitFilePlugin: Please provide "options.filename" in the EmitFilePlugin config.')
    }
    if (isEmpty(options.content)) {
      throw new Error('EmitFilePlugin: Please provide "options.content" in the EmitFilePlugin config.')
    }
    this.options = options
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.thisCompilation.tap(EmitFilePlugin.name, (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: EmitFilePlugin.name,
          stage: this.options.stage ?? webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async () => this.emitFile(compilation),
      )
    })
  }

  private async emitFile(compilation: Compilation) {
    const outputPath = this.options.path ?? compilation.options.output.path
    let { filename } = this.options

    if (this.options.hash) {
      const hash = compilation.hash ?? ''
      filename = filename.replace('[hash]', hash)
    }

    // @ts-ignore
    const outputPathAndFilename = path.resolve(compilation.options.output.path, outputPath, filename)

    // @ts-ignore
    const relativeOutputPath = path.relative(compilation.options.output.path, outputPathAndFilename)

    // @ts-ignore
    const content =
      typeof this.options.content === 'function' ? this.options.content(compilation.assets) : this.options.content

    // @ts-ignore
    const source = content instanceof webpack.sources.Source ? content : new webpack.sources.RawSource(content)

    compilation.emitAsset(relativeOutputPath, source)
  }
}
