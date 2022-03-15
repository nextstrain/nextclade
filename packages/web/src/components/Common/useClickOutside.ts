import { MutableRefObject, useEffect } from 'react'

/**
 * Hook that alerts clicks outside of the passed ref
 * Author: Ben Bud
 * Source: https://stackoverflow.com/a/42234988
 */
export function useClickOutside<T extends HTMLElement | SVGElement>(
  ref: MutableRefObject<T | null>,
  onClickOutside: () => void,
) {
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (event.target instanceof Node && ref.current && !ref.current.contains(event.target)) {
        onClickOutside()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClickOutside, ref])
}
