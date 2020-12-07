import { get, pick } from 'lodash'

import type { Gene } from 'src/algorithms/types'
import { GENOTYPE_COLORS } from 'src/constants'
import { sanitizeError } from 'src/helpers/sanitizeError'

export interface GeneMapJsonEntry {
  start: number
  end: number
}

export interface GeneMapJson {
  genome_annotations: Record<string, GeneMapJsonEntry> // eslint-disable-line camelcase
}

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

export function isDivisibleBy(x: number, divisor: number) {
  return x % 3 === 0
}

export function getGeneMap(geneMapJson: GeneMapJson): Gene[] {
  const geneMap = get(geneMapJson, 'genome_annotations')

  if (!geneMap) {
    throw new ErrorGeneMapIo(`Gene map format not recognized: property 'genome_annotations' is missing`)
  }

  return Object.entries(geneMap).map(([name, geneDataRaw], i) => {
    const color = GENOTYPE_COLORS[(i + 1) % GENOTYPE_COLORS.length]
    const { start: begin, end } = pick(geneDataRaw, ['start', 'end'])
    const geneWithoutColor = { name, range: { begin, end } }

    const length = end - begin

    if (length) {
      throw new ErrorGeneInvalidRange(
        `GeneMap: in gene "${name}": expected gene.begin < gene.end, but got ${begin} < ${end}`,
      )
    }

    if (!isDivisibleBy(length, 3)) {
      throw new ErrorGeneInvalidRange(
        `GeneMap: in gene "${name}": expected gene length to be divisible by 3, but got ${length}`,
      )
    }

    return { ...geneWithoutColor, color }
  })
}
