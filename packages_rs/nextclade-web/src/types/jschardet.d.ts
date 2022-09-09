declare module 'jschardet' {
  export interface DetectedEncoding {
    encoding: string
    confidence: number
  }

  function detect(buffer: Buffer | string, options?: { minimumThreshold: number }): DetectedEncoding

  function detectAll(buffer: Buffer | string, options?: { minimumThreshold: number }): DetectedEncoding[]

  function enableDebug(): void

  const chardet = {
    detect,
    detectAll,
    enableDebug,
  }

  export default chardet
}
