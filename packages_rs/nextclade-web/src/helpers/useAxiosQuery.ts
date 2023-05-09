import { useQuery } from 'react-query'
import type { UseQueryOptions } from 'react-query'

import { axiosFetch } from 'src/io/axiosFetch'
import { useMemo } from 'react'

export type UseAxiosQueryOptions<TData = unknown> = UseQueryOptions<TData, Error, TData, string[]>

function queryOptionsDefaulted<TData>(options?: UseAxiosQueryOptions<TData>): UseAxiosQueryOptions<TData> {
  let newOptions: UseAxiosQueryOptions<TData> = {
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: Number.POSITIVE_INFINITY,
  }
  if (options) {
    newOptions = { ...newOptions, ...options }
  }
  return newOptions
}

/** Makes a cached fetch request */
export function useAxiosQuery<TData = unknown>(url: string, options?: UseAxiosQueryOptions<TData>): TData {
  const newOptions = useMemo(() => queryOptionsDefaulted(options), [options])
  const res = useQuery<TData, Error, TData, string[]>([url], async () => axiosFetch(url), newOptions)
  return useMemo(() => {
    if (!res.data) {
      throw new Error(`Fetch failed: ${url}`)
    }
    return res.data
  }, [res.data, url])
}
