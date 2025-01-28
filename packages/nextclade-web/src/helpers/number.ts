export function ensureNumber(x?: boolean | number | null): number {
  if (!x || typeof x === 'boolean') {
    return 0
  }
  return x
}

export function isEven(x: number): boolean {
  if (!Number.isInteger(x)) {
    return false
  }
  return x % 2 === 0
}

export function isOdd(x: number): boolean {
  return !isEven(x)
}

export function safeDiv(numer?: number, denom?: number, defaultValue?: number): number
export function safeDiv(numer?: number, denom?: number, defaultValue?: undefined): number | undefined
export function safeDiv(numer?: number, denom?: number, defaultValue: number | undefined = 0): number | undefined {
  if (denom === 0 || numer === undefined || denom === undefined) {
    return defaultValue
  }
  return numer / denom
}
