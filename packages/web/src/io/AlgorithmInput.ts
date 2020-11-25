import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { AlgorithmInputType } from 'src/state/algorithm/algorithm.state'
import { readFile } from 'src/helpers/readFile'
import { numbro } from 'src/i18n/i18n'

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
    const bytes = this.file.size
    const size = numbro(bytes).format({ output: 'byte', base: 'decimal', spaceSeparated: true, mantissa: 1 })
    return `${this.name} (${size})`
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
    return this.url
  }

  public async getContent(): Promise<string> {
    return 'TODO'
  }
}

export class AlgorithmInputString implements AlgorithmInput {
  public readonly type: AlgorithmInputType = AlgorithmInputType.String as const

  private readonly content: string

  constructor(content: string) {
    this.content = content
  }

  // eslint-disable-next-line class-methods-use-this
  public get name(): string {
    return 'Pasted sequences'
  }

  public get description(): string {
    const bytes = this.content.length
    const size = numbro(bytes).format({ output: 'byte', base: 'decimal', spaceSeparated: true, mantissa: 1 })
    return `${this.name} (${size})`
  }

  public async getContent(): Promise<string> {
    return this.content
  }
}
