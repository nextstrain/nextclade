/* eslint-disable security/detect-unsafe-regex */
import type { Nucleotide, NucleotideSubstitution } from 'src/algorithms/types'
import { ANY } from 'src/algorithms/nucleotides'

import { parsePosition } from './parsePosition'

export function parseNucleotide(raw: string | undefined | null) {
  if (!raw || raw.length === 0 || raw === ANY) {
    return undefined
  }
  return raw.toUpperCase() as Nucleotide
}

export function parseMutation(formatted: string): Partial<NucleotideSubstitution> | undefined {
  const match = /^(?<refNuc>[.a-z-]{0,1})(?<pos>(\d)*)(?<queryNuc>[.a-z-]{0,1})$/i.exec(formatted)

  if (!match?.groups) {
    return undefined
  }

  if (Object.values(match?.groups).every((s) => s.length === 0)) {
    return undefined
  }

  const refNuc = parseNucleotide(match.groups?.refNuc)
  const pos = parsePosition(match.groups?.pos)
  const queryNuc = parseNucleotide(match.groups?.queryNuc)

  const result = { refNuc, pos, queryNuc }

  if (Object.values(result).every((r) => r === undefined)) {
    return undefined
  }

  return result
}
