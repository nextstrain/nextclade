import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { useQuery } from 'react-query'
import type { UseQueryOptions, UseQueryResult } from 'react-query'

import { HttpRequestError } from 'src/io/AlgorithmInput'

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

/**
 * This version skips any transforms (such as JSON parsing) and returns plain string
 */
export async function axiosFetchRaw(url: string, options?: AxiosRequestConfig): Promise<string> {
  return axiosFetch(url, { ...options, transformResponse: [] })
}

export interface UseAxiosQueryOptions<TData> extends UseQueryOptions<TData, Error> {
  delay?: number
}

export function useAxiosQuery<TData = unknown>(
  url: string,
  options?: UseAxiosQueryOptions<TData>,
): UseQueryResult<TData, Error> {
  return useQuery<TData, Error>(
    url,
    async () => {
      if (options?.delay) {
        await new Promise((resolve) => setInterval(resolve, options.delay))
      }
      return axiosFetch(url)
    },
    {
      staleTime: Number.POSITIVE_INFINITY,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: Number.POSITIVE_INFINITY,
      ...options,
    },
  )
}
