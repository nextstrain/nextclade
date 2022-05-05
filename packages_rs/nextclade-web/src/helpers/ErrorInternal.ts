import { URL_GITHUB_ISSUES } from 'src/constants'

export class ErrorInternal extends Error {
  public constructor(name: string) {
    super(
      `When selecting "${name}": no data available. This is an internal issue, likely due to a programming mistake. Please report it to developers at ${URL_GITHUB_ISSUES}.`,
    )
  }
}
