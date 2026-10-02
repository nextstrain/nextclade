import { RefCallback, useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export interface Size {
  width: number
  height: number
}

export interface SizeBeforePaint<T extends Element> {
  /** Content box size of the element, excluding its padding and scrollbar. Undefined until first measured */
  size: Size | undefined
  ref: RefCallback<T>
}

/**
 * Return the content box size of an element, and re-render with a new size before the browser paints it.
 *
 * `ResizeObserver` reports a new size after layout and before paint. A state update from there renders in a later
 * task, as in `useResizeDetector`, so the browser first paints a frame where the element has its new size and the
 * content sized from it still has the old size. This hook renders the new size in the same frame, which delays that
 * frame by the render time.
 */
export function useSizeBeforePaint<T extends Element>(): SizeBeforePaint<T> {
  const [size, setSize] = useState<Size>()
  const observerRef = useRef<ResizeObserver>()

  const ref = useCallback((element: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = undefined
    if (!element) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      flushSync(() => {
        setSize((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }))
      })
    })
    observer.observe(element)
    observerRef.current = observer
  }, [])

  return { size, ref }
}
