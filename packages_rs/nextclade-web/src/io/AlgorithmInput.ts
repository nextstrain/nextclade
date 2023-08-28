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
  public readonly type: AlgorithmInputType = AlgorithmInputType.File as const

  private readonly file: File

  constructor(file: File) {
    this.file = file
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
  public readonly type: AlgorithmInputType = AlgorithmInputType.Url as const

  private readonly url: string

  constructor(url: string) {
    this.url = url
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
  public readonly type: AlgorithmInputType = AlgorithmInputType.String as const

  private readonly content: string
  private readonly contentName: string

  constructor(content: string, contentName?: string) {
    this.content = content
    this.contentName = contentName ?? 'Pasted sequences'
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
  public readonly type: AlgorithmInputType = AlgorithmInputType.Default as const

  public dataset: Dataset

  constructor(dataset: Dataset) {
    this.dataset = dataset
  }

  public get name(): string {
    const { value, valueFriendly } = this.dataset.attributes.name
    return `${valueFriendly ?? value} example sequences`
  }

  public get description(): string {
    return `${this.name}`
  }

  public async getContent(): Promise<string> {
    return axiosFetchRaw(this.dataset.files.examples)
  }
}
