const DEFAULT_NUM_THREADS = 4

export function getNumThreads() {
  if (typeof navigator !== 'object' || typeof navigator?.hardwareConcurrency !== 'number') {
    return DEFAULT_NUM_THREADS
  }

  // eslint-disable-next-line prefer-destructuring
  const hardwareConcurrency = navigator.hardwareConcurrency
  if (hardwareConcurrency < DEFAULT_NUM_THREADS) {
    return DEFAULT_NUM_THREADS
  }

  return hardwareConcurrency
}
