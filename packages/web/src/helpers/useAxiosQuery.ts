import axios, { AxiosError } from 'axios'
import { useQuery } from 'react-query'
import type { UseQueryOptions, UseQueryResult } from 'react-query'

import { HttpRequestError } from 'src/io/AlgorithmInput'

export async function axiosFetch<TData = unknown>(url: string): Promise<TData> {
  let res
  try {
    res = await axios.get(url)
  } catch (error_) {
    const error = error_ as AxiosError
    throw new HttpRequestError(error)
  }

  if (!res?.data) {
    throw new Error(`Unable to fetch: request to URL "${url}" resulted in no data`)
  }

  return res.data as TData
}

export function useAxiosQuery<TData = unknown>(
  url: string,
  options?: UseQueryOptions<TData, Error>,
): UseQueryResult<TData, Error> {
  return useQuery<TData, Error>(url, async () => axiosFetch(url), {
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: Number.POSITIVE_INFINITY,
    ...options,
  })
}
