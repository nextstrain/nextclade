import type { Aminoacid, AaSub } from 'src/types'
import { ANY } from 'src/constants'
import { parsePosition } from './parsePosition'

export function parseAminoacid(raw: string | undefined | null) {
  if (!raw || raw.length === 0 || raw === ANY) {
    return undefined
  }
  return raw.toUpperCase() as Aminoacid
}

export function parseGene(raw: string | undefined | null) {
  if (!raw || raw.length === 0 || raw === ANY) {
    return undefined
  }
  return raw
}

export function parseAminoacidChange(formatted: string): Partial<AaSub> | undefined {
  const match = /^(?<gene>.*):(?<refAA>[.a-z]{0,1})(?<codon>(\d)*)(?<queryAA>[.a-z]{0,1})$/i.exec(formatted)

  if (!match?.groups) {
    return undefined
  }

  if (Object.values(match?.groups).every((s) => s.length === 0)) {
    return undefined
  }

  const gene = parseGene(match.groups?.gene)
  const refAA = parseAminoacid(match.groups?.refAA)
  const codon = parsePosition(match.groups?.codon)
  const queryAA = parseAminoacid(match.groups?.queryAA)

  const result: Partial<AaSub> = { cdsName: gene, refAa: refAA, pos: codon, qryAa: queryAA }

  if (Object.values(result).every((r) => r === undefined)) {
    return undefined
  }

  return result
}
