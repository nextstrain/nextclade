/* eslint-disable security/detect-unsafe-regex */
import type { Nucleotide, NucleotideSubstitution } from 'src/algorithms/types'

export const NUCLEOTIDE_WILDCARD = '.' as const

export function parseNucleotideCharacter(raw: string | undefined | null) {
  if (!raw || raw.length === 0 || raw === NUCLEOTIDE_WILDCARD) {
    return undefined
  }
  return raw.toUpperCase() as Nucleotide
}

export function parseNucleotidePosition(raw: string | undefined | null) {
  if (!raw || raw.length === 0 || raw === NUCLEOTIDE_WILDCARD) {
    return undefined
  }

  const num = Number.parseInt(raw, 10)

  if (!Number.isFinite(num)) {
    return undefined
  }

  return num - 1
}

export function parseMutation(formatted: string): Partial<NucleotideSubstitution> | undefined {
  const match = /^(?<refNuc>[.a-z-])(?<pos>(\d)*)(?<queryNuc>[.a-z-]{0,1})$/i.exec(formatted)

  if (!match?.groups) {
    return undefined
  }

  if (Object.values(match?.groups).every((s) => s.length === 0)) {
    return undefined
  }

  const refNuc = parseNucleotideCharacter(match.groups?.refNuc)
  const pos = parseNucleotidePosition(match.groups?.pos)
  const queryNuc = parseNucleotideCharacter(match.groups?.queryNuc)

  const result = { refNuc, pos, queryNuc }

  if (Object.values(result).every((r) => r === undefined)) {
    return undefined
  }

  return result
}
