declare module '@packtracker/webpack-plugin' {
  import webpack from 'webpack'

  export interface PacktrackerPluginOptions {
    author?: string
    branch?: string
    commit?: string
    committed_at?: number
    exclude_assets?: string[] | RegExp[]
    fail_build?: boolean
    message?: string
    prior_commit?: string
    project_token?: string
    upload?: boolean
  }

  declare class PacktrackerPlugin extends webpack.Plugin {
    public constructor(options: PacktrackerPluginOptions)
  }

  export default PacktrackerPlugin
}
