import WebpackBar from 'webpackbar'

export interface WithFriendlyConsoleParams {
  clearConsole: boolean
  projectRoot: string
  packageName: string
  progressBarColor: string
}

export default function webpackFriendlyConsole({
  clearConsole,
  projectRoot,
  packageName,
  progressBarColor,
}: WithFriendlyConsoleParams) {
  return [new WebpackBar({ name: packageName, color: progressBarColor })]
}
