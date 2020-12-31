import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { AlgorithmInputType } from 'src/state/algorithm/algorithm.state'
import { readFile } from 'src/helpers/readFile'
import { numbro } from 'src/i18n/i18n'

export class HttpRequestError extends Error {
  public readonly request: AxiosRequestConfig
  public readonly response?: AxiosResponse

  constructor(error_: AxiosError) {
    super(error_.message)
    this.request = error_.config
    this.response = error_.response
  }
}

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
  private size?: number

  constructor(url: string) {
    this.url = url
  }

  public get name(): string {
    return this.url
  }

  public get description(): string {
    if (this.size !== undefined) {
      return `${this.name} (${formatBytes(this.size)})`
    }

    return this.name
  }

  public async getContent(): Promise<string> {
    try {
      const { data } = await Axios.get<string>(this.url, { transformResponse: [] })
      this.size = data.length
      return data
    } catch (error_) {
      throw new HttpRequestError(error_ as AxiosError)
    }
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
