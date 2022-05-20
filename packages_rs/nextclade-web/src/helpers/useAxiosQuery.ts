import { useQuery } from 'react-query'
import type { UseQueryOptions, UseQueryResult } from 'react-query'

import { axiosFetch } from 'src/io/axiosFetch'

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
        await new Promise((resolve) => {
          setInterval(resolve, options.delay)
        })
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
