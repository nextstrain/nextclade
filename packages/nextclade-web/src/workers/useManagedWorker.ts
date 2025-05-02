import { useRef, useReducer, useCallback } from 'react'

export function useManagedWorker<W>() {
  const workerRef = useRef<W>()
  const locked = useRef(false)
  const [, forceRender] = useReducer((x: number) => x + 1, 0)

  const stop = useCallback(async (stopFn?: (w: W) => Promise<void>) => {
    if (!workerRef.current || !locked.current) {
      return
    }
    locked.current = true
    forceRender()
    try {
      await stopFn?.(workerRef.current)
    } finally {
      workerRef.current = undefined
      locked.current = false
      forceRender()
    }
  }, [])

  const start = useCallback(async (startFn: () => Promise<W>) => {
    if (locked.current) {
      return
    }
    locked.current = true
    forceRender()
    try {
      workerRef.current = await startFn()
    } finally {
      await stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    start,
    stop,
    isRunning: locked.current,
  }
}
