import { get } from 'lodash'
import type { Aminoacid } from 'src/algorithms/types'

export const AMINOACID_UNKNOWN = ('X' as const) as Aminoacid
export const AMINOACID_GAP = ('-' as const) as Aminoacid

const codonTable: Record<string, Aminoacid> = {
  '---': AMINOACID_GAP,
  'AAA': 'K' as Aminoacid,
  'AAC': 'N' as Aminoacid,
  'AAG': 'K' as Aminoacid,
  'AAT': 'N' as Aminoacid,
  'ACA': 'T' as Aminoacid,
  'ACC': 'T' as Aminoacid,
  'ACG': 'T' as Aminoacid,
  'ACT': 'T' as Aminoacid,
  'AGA': 'R' as Aminoacid,
  'AGC': 'S' as Aminoacid,
  'AGG': 'R' as Aminoacid,
  'AGT': 'S' as Aminoacid,
  'ATA': 'I' as Aminoacid,
  'ATC': 'I' as Aminoacid,
  'ATG': 'M' as Aminoacid,
  'ATT': 'I' as Aminoacid,
  'CAA': 'Q' as Aminoacid,
  'CAC': 'H' as Aminoacid,
  'CAG': 'Q' as Aminoacid,
  'CAT': 'H' as Aminoacid,
  'CCA': 'P' as Aminoacid,
  'CCC': 'P' as Aminoacid,
  'CCG': 'P' as Aminoacid,
  'CCT': 'P' as Aminoacid,
  'CGA': 'R' as Aminoacid,
  'CGC': 'R' as Aminoacid,
  'CGG': 'R' as Aminoacid,
  'CGT': 'R' as Aminoacid,
  'CTA': 'L' as Aminoacid,
  'CTC': 'L' as Aminoacid,
  'CTG': 'L' as Aminoacid,
  'CTT': 'L' as Aminoacid,
  'GAA': 'E' as Aminoacid,
  'GAC': 'D' as Aminoacid,
  'GAG': 'E' as Aminoacid,
  'GAT': 'D' as Aminoacid,
  'GCA': 'A' as Aminoacid,
  'GCC': 'A' as Aminoacid,
  'GCG': 'A' as Aminoacid,
  'GCT': 'A' as Aminoacid,
  'GGA': 'G' as Aminoacid,
  'GGC': 'G' as Aminoacid,
  'GGG': 'G' as Aminoacid,
  'GGT': 'G' as Aminoacid,
  'GTA': 'V' as Aminoacid,
  'GTC': 'V' as Aminoacid,
  'GTG': 'V' as Aminoacid,
  'GTT': 'V' as Aminoacid,
  'TAA': '*' as Aminoacid,
  'TAC': 'Y' as Aminoacid,
  'TAG': '*' as Aminoacid,
  'TAT': 'Y' as Aminoacid,
  'TCA': 'S' as Aminoacid,
  'TCC': 'S' as Aminoacid,
  'TCG': 'S' as Aminoacid,
  'TCT': 'S' as Aminoacid,
  'TGA': '*' as Aminoacid,
  'TGC': 'C' as Aminoacid,
  'TGG': 'W' as Aminoacid,
  'TGT': 'C' as Aminoacid,
  'TTA': 'L' as Aminoacid,
  'TTC': 'F' as Aminoacid,
  'TTG': 'L' as Aminoacid,
  'TTT': 'F' as Aminoacid,
} as const

export function getCodon(codon: string): Aminoacid {
  const aminoacid = get(codonTable, codon)

  if (process.env.NODE_ENV !== 'production' && !aminoacid) {
    if (codon.length !== 3) {
      console.warn(`getCodon: invalid codon "${codon}" of length ${codon.length}: translating to aminoacid "${AMINOACID_UNKNOWN}", but this is probably a bug.`) // prettier-ignore
    } else if (codon.includes(AMINOACID_GAP)) {
      console.info(`getCodon: ambiguous codon "${codon}: translating to aminoacid "${AMINOACID_UNKNOWN}"`)
    } else {
      console.info(`getCodon: unknown codon "${codon}: translating to aminoacid "${AMINOACID_UNKNOWN}"`)
    }
  }

  return aminoacid ?? AMINOACID_UNKNOWN
}
