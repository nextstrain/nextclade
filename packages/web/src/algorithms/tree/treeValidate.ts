import copy from 'fast-copy'

import type { AuspiceJsonV2 } from 'auspice'
import { sanitizeError } from 'src/helpers/sanitizeError'

class ErrorAuspiceJsonV2Io extends Error {}

export function treeDeserialize(content: string) {
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch (error_: unknown) {
    const error = sanitizeError(error_)
    throw new ErrorAuspiceJsonV2Io(`Tree format not recognized. JSON parsing error: ${error.message}`)
  }
}

export function treeValidate(auspiceDataDangerous: unknown) {
  // TODO: validate and sanitize
  const auspiceData = copy(auspiceDataDangerous) as AuspiceJsonV2

  const auspiceTreeVersionExpected = 'v2'
  const auspiceTreeVersion = (auspiceData?.version as string | undefined) ?? 'undefined'
  if (auspiceTreeVersion !== auspiceTreeVersionExpected) {
    throw new ErrorAuspiceJsonV2Io(
      `Tree format not recognized. Expected version "${auspiceTreeVersionExpected}", got "${auspiceTreeVersion}"`,
    )
  }
  return auspiceDataDangerous as AuspiceJsonV2
}
