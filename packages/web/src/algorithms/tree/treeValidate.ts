import copy from 'fast-copy'

import type { AuspiceJsonV2 } from 'auspice'

export function treeValidate(auspiceDataDangerous: unknown) {
  // TODO: validate and sanitize
  const auspiceData = copy(auspiceDataDangerous) as AuspiceJsonV2

  const auspiceTreeVersionExpected = 'v2'
  const auspiceTreeVersion = (auspiceData?.version as string | undefined) ?? 'undefined'
  if (auspiceTreeVersion !== auspiceTreeVersionExpected) {
    throw new Error(
      `Tree format not recognized. Expected version "${auspiceTreeVersionExpected}", got "${auspiceTreeVersion}"`,
    )
  }
  return auspiceDataDangerous as AuspiceJsonV2
}
