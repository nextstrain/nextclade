/* eslint-disable no-loops/no-loops */
import chardet from 'jschardet'
import { isString, sortBy } from 'lodash'
import { sanitizeError } from 'src/helpers/sanitizeError'

export class FileReaderError extends Error {
  public readonly file: File

  constructor(file: File, message?: string) {
    let err = `Cannot read file: "${file.name}" (size: ${file.size ?? 0} bytes)`
    if (message) {
      err = `Cannot read file: ${message}: "${file.name}" (size: ${file.size ?? 0} bytes)`
    }
    super(err)
    this.file = file
  }
}

export class FileReaderEncodingError extends FileReaderError {
  public readonly file: File

  constructor(file: File, message?: string) {
    let err = `Please try to convert your file to ASCII or UTF-8 and try again!`
    if (message) {
      err = `${message}. ${err}`
    }
    super(file, err)
    this.file = file
  }
}

export function readFile(file: File): Promise<string> {
  const reader = new FileReader()

  return new Promise((resolve, reject) => {
    reader.addEventListener('error', (event) => {
      reader.abort()
      const message = event.target?.error?.message
      reject(new FileReaderError(file, message))
    })

    reader.addEventListener('load', (event) => {
      const buf = event?.target?.result
      if (!buf) {
        return reject(new FileReaderError(file, 'Result is empty'))
      }
      if (!isString(buf)) {
        return reject(new FileReaderError(file, 'Result is not a string'))
      }

      const bytes = Uint8Array.from(buf, (x) => x.charCodeAt(0)) // eslint-disable-line unicorn/prefer-code-point
      const encodings = sortBy(chardet.detectAll(buf), (enc) => -enc.confidence)

      if (encodings.length === 0) {
        return reject(new FileReaderEncodingError(file, 'Unable detect file encoding'))
      }

      for (const { encoding } of encodings) {
        try {
          const decoder = new TextDecoder(encoding)
          const content = decoder.decode(bytes)

          if (!content || content.length === 0) {
            return reject(new FileReaderEncodingError(file, 'File contents is empty'))
          }

          return resolve(content)
        } catch (error_: unknown) {
          const error = sanitizeError(error_)
          console.warn(`When converting file encoding from ${encoding} to UTF-8: ${error.message}`)
        }
      }

      const encodingsList = encodings.map((enc) => enc.encoding).join(', ')
      return reject(
        new FileReaderEncodingError(
          file,
          `Unable detect file encoding. Attempted to convert from the following encodings: ${encodingsList}`,
        ),
      )
    })

    reader.readAsBinaryString(file)
  })
}
