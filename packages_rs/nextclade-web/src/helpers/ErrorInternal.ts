export class ErrorInternal extends Error {
  public constructor(message: string) {
    super(
      `Internal Error: ${message}. This is an internal issue, likely due to a programming mistake. Please report it to developers!`,
    )
  }
}
