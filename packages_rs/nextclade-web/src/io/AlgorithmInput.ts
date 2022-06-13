import { concurrent } from 'fasy'
import { AlgorithmInput, AlgorithmInputType, Dataset } from 'src/algorithms/types'
import { axiosFetchRaw } from 'src/io/axiosFetch'

import { readFile } from 'src/helpers/readFile'
import { numbro } from 'src/i18n/i18n'
import { sumBy } from 'lodash'

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

  private readonly files: File[]

  constructor(files: File[]) {
    this.files = files
  }

  public get name(): string {
    return this.files.map((file) => file.name).join(', ')
  }

  public get description(): string {
    if (this.files.length === 1) {
      return `${this.name} (${formatBytes(this.files[0].size)})`
    }

    const size = sumBy(this.files, (file) => file.size)
    return `${this.files.length} files (total ${formatBytes(size)})`
  }

  public async getContent(): Promise<string> {
    const strs = await concurrent.map(async (file) => readFile(file), this.files)
    return strs.join('\n')
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
    return `${this.dataset.attributes.name.value} example`
  }

  public get description(): string {
    return `${this.name}`
  }

  public async getContent(): Promise<string> {
    return axiosFetchRaw(this.dataset.files['sequences.fasta'])
  }
}
