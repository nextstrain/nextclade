import { saveAs } from 'file-saver'
import { toByteArray } from 'base64-js'
import JSZip from 'jszip'

export class ExportErrorBlobApiNotSupported extends Error {
  constructor() {
    super('Error: when exporting: `Blob()` API is not supported by this browser')
  }
}

export function checkBlobSupport() {
  try {
    return !!new Blob()
  } catch {
    throw new ExportErrorBlobApiNotSupported()
  }
}

export interface SaveFileOptions {
  mimeType?: string
}

export function saveFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  saveAs(blob, filename)
}

export function saveBlobFile(content: Blob, filename: string) {
  saveAs(content, filename)
}

export function saveBase64File(content: string, filename: string, mimeType = 'application/octet-stream') {
  saveBlobFile(base64ToBlob(content, mimeType), filename)
}

export function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const byteArray = toByteArray(base64)
  return new Blob([byteArray], { type: mimeType })
}

export interface ZipFileDescription {
  filename: string
  data: string
}

export interface SakeZipParams {
  filename: string
  files: ZipFileDescription[]
}

export async function saveZip({ filename, files }: SakeZipParams) {
  const zip = new JSZip()
  files.forEach(({ filename, data }) => zip.file(filename, data))
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  saveBlobFile(zipBlob, filename)
}
