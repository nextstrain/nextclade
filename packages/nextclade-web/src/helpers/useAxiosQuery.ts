import { useMemo } from 'react'
import { StrictOmit } from 'ts-essentials'
import { QueryKey, UseQueryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { axiosFetch, axiosFetchOrUndefined } from 'src/helpers/axiosFetch'

const QUERY_OPTIONS_DEFAULT = {
  staleTime: Number.POSITIVE_INFINITY,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchInterval: Number.POSITIVE_INFINITY,
}

function queryOptionsDefaulted<T>(options: T) {
  let newOptions = QUERY_OPTIONS_DEFAULT
  if (options) {
    newOptions = { ...newOptions, ...options }
  }
  return newOptions
}

export type QueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'initialData'> & {
  initialData?: () => undefined
}

export type UseAxiosQueryOptions<TData = unknown> = StrictOmit<
  QueryOptions<TData, Error, TData, string[]>,
  'queryKey' | 'queryFn'
>

/** Makes a cached fetch request */
export function useAxiosQuery<TData = unknown>(url: string, options?: UseAxiosQueryOptions<TData>): TData {
  const newOptions = useMemo(() => queryOptionsDefaulted(options), [options])
  const res = useSuspenseQuery<TData, Error, TData, string[]>({
    queryKey: [url],
    queryFn: async () => axiosFetch(url),
    ...newOptions,
  })

  return useMemo(() => {
    if (!res.data) {
      throw new Error(`Fetch failed: ${url}`)
    }
    return res.data
  }, [res.data, url])
}

/** Makes a cached fetch request, ignoring errors */
export function useAxiosQueryOrUndefined<TData = unknown>(
  url: string,
  options?: UseAxiosQueryOptions<TData | undefined>,
): TData | undefined {
  const newOptions = useMemo(() => queryOptionsDefaulted(options), [options])
  const res = useSuspenseQuery<TData | undefined, Error, TData | undefined, string[]>({
    queryKey: [url],
    queryFn: async () => axiosFetchOrUndefined(url),
    ...newOptions,
  })
  return useMemo(() => {
    if (!res.data) {
      return undefined
    }
    return res.data
  }, [res.data])
}
