import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

export class HttpRequestError extends Error {
  public readonly request: AxiosRequestConfig
  public readonly response?: AxiosResponse

  constructor(error_: AxiosError) {
    super(error_.message)
    this.request = error_.config
    this.response = error_.response
  }
}

export async function axiosFetch<TData = unknown>(url: string, options?: AxiosRequestConfig): Promise<TData> {
  let res
  try {
    res = await axios.get(url, options)
  } catch (error_) {
    const error = error_ as AxiosError
    throw new HttpRequestError(error)
  }

  if (!res?.data) {
    throw new Error(`Unable to fetch: request to URL "${url}" resulted in no data`)
  }

  return res.data as TData
}

export async function axiosFetchMaybe(url?: string): Promise<string | undefined> {
  if (!url) {
    return undefined
  }
  return axiosFetch(url)
}

/**
 * This version skips any transforms (such as JSON parsing) and returns plain string
 */
export async function axiosFetchRaw(url: string, options?: AxiosRequestConfig): Promise<string> {
  return axiosFetch(url, { ...options, transformResponse: [] })
}

export async function axiosFetchRawMaybe(url?: string): Promise<string | undefined> {
  if (!url) {
    return undefined
  }
  return axiosFetchRaw(url)
}
