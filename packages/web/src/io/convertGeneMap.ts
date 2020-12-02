import type { AuspiceJsonV2, GeneMapJson } from 'auspice'

import type { Gene } from 'src/algorithms/types'
import { GENOTYPE_COLORS } from 'src/constants'
import { sanitizeError } from 'src/helpers/sanitizeError'

export class ErrorGeneMapIo extends Error {}

export function geneMapDeserialize(content: string) {
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch (error_: unknown) {
    const error = sanitizeError(error_)
    throw new ErrorGeneMapIo(`Gene map format not recognized. JSON parsing error: ${error.message}`)
  }
}

export function geneMapValidate(geneMapJsonDangerous: unknown) {
  // TODO
  return geneMapJsonDangerous as GeneMapJson
}

export function getGeneMapJsonFromTree(auspiceData: AuspiceJsonV2): GeneMapJson {
  const geneMapJsonDangerous = auspiceData?.meta?.genome_annotations
  if (!geneMapJsonDangerous) {
    throw new ErrorGeneMapIo(
      `Gene map format not recognized. The Auspice JSON provided does not contain required 'meta.genome_annotations' field`,
    )
  }

  return geneMapValidate(geneMapJsonDangerous)
}

export function convertGeneMap(geneMapJson: GeneMapJson): Gene[] {
  return Object.entries(geneMapJson)
    .filter(([name]) => name !== 'nuc')
    .map(([name, geneDataRaw], i) => {
      const begin = geneDataRaw.start
      const end = geneDataRaw.end // eslint-disable-line prefer-destructuring
      const frame = begin % 3
      const color = GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]
      return { name, range: { begin, end }, frame, color }
    })
}
