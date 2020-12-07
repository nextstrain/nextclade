import { inRange } from 'lodash'
import copy from 'fast-copy'

import type {
  AminoacidDeletion,
  AminoacidSubstitution,
  Gene,
  NucleotideDeletion,
  NucleotideSubstitution,
} from './types'
import { AMINOACID_GAP, getCodon } from './codonTable'

/**
 * Reconstructs the query sequence gene with insertions removed and deletions filled with gaps
 */
export function reconstructQuery(
  gene: Gene,
  refSequence: string,
  mutations: NucleotideSubstitution[],
  deletions: NucleotideDeletion[],
) {
  // TODO: precondition(isDivisibleBy(gene.end - gene.begin, 3))
  const { begin: geneBegin, end: geneEnd } = gene.range

  // Take a gene from the reference sequence
  const refGene = refSequence.slice(geneBegin, geneEnd).split('')
  const queryGene = copy(refGene)
  // TODO: const initialLength = queryGene.length
  // TODO: invariant(isDivisibleBy(initialLength, 3))

  // Implant substitutions from query sequence
  for (const mut of mutations) {
    const { pos, queryNuc } = mut
    if (inRange(pos, geneBegin, geneEnd)) {
      queryGene[pos] = queryNuc
    }
  }

  for (const del of deletions) {
    const { start: delBegin, length: delLength } = del
    const delEnd = delBegin + delLength

    // Check deletion range bounds to prevent overflowing the gene range
    const begin = Math.max(geneBegin, delBegin)
    const end = Math.min(geneEnd, delEnd)

    // TODO: invariant(begin > 0)
    // TODO: invariant(begin < queryGene.length)
    // TODO: invariant(end < queryGene.length)

    // Fill deletion range with gaps
    for (let i = begin; i < end; ++i) {
      queryGene[i] = AMINOACID_GAP
    }
  }

  // TODO: postcondition(isDivisibleBy(queryGene.length, 3))
  // TODO: postcondition(queryGene.length, initialLength))
  return { refGene: refGene.join(''), queryGene: queryGene.join('') }
}

export function addAminoacidChanges(
  gene: Gene,
  refGene: string,
  queryGene: string,
  aaSubstitutions: AminoacidSubstitution[],
  aaDeletions: AminoacidDeletion[],
) {
  // TODO: precondition(isDivisibleBy(refGene.length, 3))
  // TODO: precondition(isDivisibleBy(queryGene.length, 3))

  for (let codon = 0; codon < queryGene.length; codon += 3) {
    const queryCodon = queryGene.slice(codon, codon + 3)
    const refCodon = refGene.slice(codon, codon + 3)

    const refAA = getCodon(refCodon)
    const queryAA = getCodon(queryCodon)

    if (queryAA === '-') {
      aaDeletions.push({ refAA, codon, gene: gene.name })
    }

    if (refAA !== queryAA) {
      aaSubstitutions.push({ refAA, queryAA, codon, gene: gene.name })
    }
  }
}

export interface GetAllAminoAcidChangesResult {
  aaSubstitutions: AminoacidSubstitution[]
  aaDeletions: AminoacidDeletion[]
}

export function getAminoAcidChanges(
  mutations: NucleotideSubstitution[],
  deletions: NucleotideDeletion[],
  refSequence: string,
  geneMap: Gene[],
): GetAllAminoAcidChangesResult {
  const aaSubstitutions: AminoacidSubstitution[] = []
  const aaDeletions: AminoacidDeletion[] = []

  for (const gene of geneMap) {
    const { refGene, queryGene } = reconstructQuery(gene, refSequence, mutations, deletions)
    addAminoacidChanges(gene, refGene, queryGene, /* out */ aaSubstitutions, /* out */ aaDeletions)
  }

  return { aaSubstitutions, aaDeletions }
}
