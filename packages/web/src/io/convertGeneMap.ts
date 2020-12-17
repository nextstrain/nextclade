import type { AuspiceJsonV2, GeneMapJson } from 'auspice'

import type { Gene } from 'src/algorithms/types'
import { GENOTYPE_COLORS } from 'src/constants'
import { sanitizeError } from 'src/helpers/sanitizeError'

export class ErrorGeneMapIo extends Error {}

export class ErrorGeneInvalidRange extends Error {}

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
      // `-1` to convert to 0-based indices
      const begin = geneDataRaw.start - 1

      // `-1` to convert to 0-based indices
      // `+1` to make the range semi-open (upper boundary is not included into the range)
      const end = geneDataRaw.end // eslint-disable-line prefer-destructuring

      const length = end - begin

      const frame = begin % 3
      const color = GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]

      if (length < 0) {
        throw new ErrorGeneInvalidRange(
          `GeneMap: in gene "${name}": expected gene.begin < gene.end, but got ${begin} < ${end} (length is ${length})`,
        )
      }

      if (length === 0) {
        console.warn(`GeneMap: in gene "${name}": gene is empty (length is 0)`)
      }

      if (length % 3 !== 0) {
        throw new ErrorGeneInvalidRange(
          `GeneMap: in gene "${name}": expected gene length to be divisible by 3, but got ${length}`,
        )
      }

      return { name, range: { begin, end }, frame, color }
    })
}
