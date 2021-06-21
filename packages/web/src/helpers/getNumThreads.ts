import { useEffect, useState } from 'react'

export const DEFAULT_NUM_THREADS = 4
export const MINIMUM_NUM_THREADS = 2
export const MEMORY_BYTES_PER_THREAD_MINIMUM = 200 * 1024 * 1024

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export interface ConsoleExtended extends Console {
  memory?: { jsHeapSizeLimit?: number }
}

export function getMemoryBytesAvailable(): number | undefined {
  try {
    if (typeof window === 'object' && typeof window.console == 'object') {
      const consoleObject = window.console as ConsoleExtended
      if (
        typeof consoleObject.memory === 'object' &&
        typeof consoleObject.memory?.jsHeapSizeLimit === 'number' &&
        Number.isFinite(consoleObject.memory?.jsHeapSizeLimit)
      ) {
        return consoleObject.memory?.jsHeapSizeLimit
      }
    }
  } catch {} // eslint-disable-line no-empty
  return undefined
}

export function guessNumThreads(numThreadsBase: number | undefined) {
  const memoryBytesAvailable = getMemoryBytesAvailable()
  if (memoryBytesAvailable && Number.isFinite(memoryBytesAvailable)) {
    const numThreadsMax = Math.floor(memoryBytesAvailable / MEMORY_BYTES_PER_THREAD_MINIMUM)
    let numThreads = Math.max(numThreadsMax, MINIMUM_NUM_THREADS)
    numThreads = Math.min(numThreads, numThreadsBase ?? Number.POSITIVE_INFINITY)
    return { memoryAvailable: memoryBytesAvailable, numThreads }
  }
  return undefined
}

export function getNumThreads() {
  if (typeof navigator !== 'object' || typeof navigator?.hardwareConcurrency !== 'number') {
    return DEFAULT_NUM_THREADS
  }

  let numThreads = navigator?.hardwareConcurrency ?? DEFAULT_NUM_THREADS
  numThreads = Math.max(numThreads, DEFAULT_NUM_THREADS)

  // Detect how much memory is available and adjust number of threads if per-thread memory is too low
  const guess = guessNumThreads(numThreads)
  if (guess?.numThreads) {
    numThreads = Math.min(numThreads, guess.numThreads)
  }

  return numThreads
}

export function useGuessNumThreads(numThreadsBase: number | undefined) {
  const [numThreads, setNumThreads] = useState<number | undefined>(numThreadsBase)
  const [memoryAvailable, setMemoryAvailable] = useState<number | undefined>(undefined)

  useEffect(() => {
    const timer = setInterval(() => {
      const guess = guessNumThreads(numThreads)
      if (guess?.numThreads && guess?.memoryAvailable) {
        setNumThreads(guess.numThreads)
        setMemoryAvailable(guess.memoryAvailable)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [setNumThreads, setMemoryAvailable])

  return { numThreads, memoryAvailable }
}
