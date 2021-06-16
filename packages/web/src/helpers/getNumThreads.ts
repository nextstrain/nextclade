const DEFAULT_NUM_THREADS = 4
const MINIMUM_NUM_THREADS = 2
const MEMORY_MB_PER_THREAD_MINIMUM = 200

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export interface ConsoleExtended extends Console {
  memory?: { jsHeapSizeLimit?: number }
}

export function getMemoryMbAvailable(): number | undefined {
  try {
    if (typeof window === 'object' && typeof window.console == 'object') {
      const consoleObject = window.console as ConsoleExtended
      if (
        typeof consoleObject.memory === 'object' &&
        typeof consoleObject.memory?.jsHeapSizeLimit === 'object' &&
        Number.isFinite(consoleObject.memory?.jsHeapSizeLimit)
      ) {
        return consoleObject.memory?.jsHeapSizeLimit / 1024 / 1024
      }
    }
  } catch {} // eslint-disable-line no-empty
  return undefined
}

export function getNumThreads() {
  if (typeof navigator !== 'object' || typeof navigator?.hardwareConcurrency !== 'number') {
    return DEFAULT_NUM_THREADS
  }

  let numThreads = navigator?.hardwareConcurrency ?? DEFAULT_NUM_THREADS
  numThreads = Math.max(numThreads, DEFAULT_NUM_THREADS)

  // Detect how much memory is available and adjust number of threads if per-thread memory is too low
  const memoryMbAvailable = getMemoryMbAvailable()
  if (memoryMbAvailable && Number.isFinite(memoryMbAvailable)) {
    const numThreadsMax = Math.floor(memoryMbAvailable / MEMORY_MB_PER_THREAD_MINIMUM)
    numThreads = Math.min(numThreads, numThreadsMax)
    numThreads = Math.max(numThreads, MINIMUM_NUM_THREADS)
  }

  return numThreads
}
