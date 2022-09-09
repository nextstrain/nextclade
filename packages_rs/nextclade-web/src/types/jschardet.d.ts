export interface DetectedEncoding {
  encoding: string
  confidence: number
}

export function detect(buffer: Buffer | string, options?: { minimumThreshold: number }): DetectedEncoding

export function detectAll(buffer: Buffer | string, options?: { minimumThreshold: number }): DetectedEncoding[]

export function enableDebug(): void
