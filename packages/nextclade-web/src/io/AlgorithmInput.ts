import { isEmpty } from 'lodash'
import { FatalError } from 'next/dist/lib/fatal-error'
import serializeJavascript from 'serialize-javascript'
import { uniqueId } from 'src/helpers/uniqueId'
import { AlgorithmInput, AlgorithmInputType, Dataset } from 'src/types'
import { axiosFetchRaw } from 'src/io/axiosFetch'
import { readFile } from 'src/helpers/readFile'
import { numbro } from 'src/i18n/i18n'

function formatBytes(bytes: number) {
  let mantissa = 1
  if (bytes < 1000) {
    mantissa = 0
  } else if (bytes > 1e6) {
    mantissa = 2
  }

  return numbro(bytes).format({ output: 'byte', base: 'decimal', spaceSeparated: true, mantissa })
}

export class AlgorithmInputFile implements AlgorithmInput {
  public readonly uid = uniqueId()
  public readonly path: string
  public readonly type: AlgorithmInputType = AlgorithmInputType.File as const
  private readonly file: File

  constructor(file: File) {
    this.file = file

    // eslint-disable-next-line unicorn/prefer-ternary
    if (this.file.webkitRelativePath.trim().length > 0) {
      this.path = this.file.webkitRelativePath
    } else {
      this.path = `${this.uid}-${this.file.name}`
    }
  }

  public get name(): string {
    return this.file.name
  }

  public get description(): string {
    return `${this.name} (${formatBytes(this.file.size)})`
  }

  public async getContent(): Promise<string> {
    return readFile(this.file)
  }
}

export class AlgorithmInputUrl implements AlgorithmInput {
  public readonly uid = uniqueId()
  public readonly path: string
  public readonly type: AlgorithmInputType = AlgorithmInputType.Url as const
  private readonly url: string

  constructor(url: string) {
    this.url = url
    this.path = this.url
  }

  public get name(): string {
    return this.url
  }

  public get description(): string {
    return this.name
  }

  public async getContent(): Promise<string> {
    return axiosFetchRaw(this.url)
  }
}

export class AlgorithmInputString implements AlgorithmInput {
  public readonly uid = uniqueId()
  public readonly path: string
  public readonly type: AlgorithmInputType = AlgorithmInputType.String as const
  private readonly content: string
  private readonly contentName: string

  constructor(content: string, contentName?: string) {
    this.path = `pasted-${this.uid}.txt`
    this.content = content
    this.contentName = contentName ?? 'Pasted text'
  }

  public get name(): string {
    return this.contentName
  }

  public get description(): string {
    return `${this.name} (${formatBytes(this.content.length)})`
  }

  public async getContent(): Promise<string> {
    return this.content
  }
}

export class AlgorithmInputDefault implements AlgorithmInput {
  public readonly uid = uniqueId()
  public readonly path: string
  public readonly type: AlgorithmInputType = AlgorithmInputType.Default as const
  public dataset: Dataset

  constructor(dataset: Dataset) {
    this.dataset = dataset
    this.path = `Examples for '${this.dataset.path}'`
  }

  public get name(): string {
    return this.path
  }

  public get description(): string {
    return this.name
  }

  public async getContent(): Promise<string> {
    if (isEmpty(this.dataset.files?.examples)) {
      const url = serializeJavascript(this.dataset.files?.examples)
      throw new FatalError(`Attempting to fetch dataset example sequences from an invalid URL: '${url}'`)
    }
    return axiosFetchRaw(this.dataset.files?.examples)
  }
}
