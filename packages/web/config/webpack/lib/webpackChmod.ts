import fs from 'fs'
import webpack from 'webpack'

export interface WebpackChmodPluginFile {
  file: string
  chmod: string
}

export interface WebpackChmodPluginOptions {
  files: WebpackChmodPluginFile[]
}

export class WebpackChmodPlugin {
  private readonly files: WebpackChmodPluginFile[]

  constructor({ files }: WebpackChmodPluginOptions) {
    this.files = files
  }

  public apply(compiler: webpack.Compiler) {
    compiler.hooks.done.tap('WebpackChmodPlugin', (stats) => {
      this.files.forEach(({ file, chmod }) => {
        fs.chmodSync(file, chmod)
      })
    })
  }
}
