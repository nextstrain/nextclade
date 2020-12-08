import copy from 'fast-copy'

import type {
  AminoacidDeletion,
  AminoacidSubstitution,
  Gene,
  NucleotideDeletion,
  NucleotideDeletionWithAminoacids,
  NucleotideSubstitution,
  NucleotideSubstitutionWithAminoacids,
  Range,
} from './types'
import { AMINOACID_GAP, getCodon } from './codonTable'
import { contains, inRange } from './haveIntersectionStrict'

/**
 * Reconstructs the query gene sequence with insertions removed and deletions filled with gaps,
 * also returns reference gene sequence.
 */
export function reconstructGeneSequences(
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

    if (inRange(pos, gene.range)) {
      const genePos = pos - geneBegin // Position relative to the gene start
      if (genePos >= 0 && genePos < queryGene.length) {
        queryGene[genePos] = queryNuc
      }
    }
  }

  for (const del of deletions) {
    const { start: delBegin, length: delLength } = del
    const delEnd = delBegin + delLength

    // Check deletion range bounds to prevent overflowing the gene range
    const begin = Math.max(geneBegin, delBegin)
    const end = Math.min(geneEnd, delEnd)

    // TODO: invariant(begin > 0)
    // TODO: invariant(begin <= end)
    // TODO: invariant(end - begin <= queryGene.length)

    // Fill deletion range with gaps
    for (let pos = begin; pos < end; ++pos) {
      const genePos = pos - geneBegin // Position relative to the gene start
      if (genePos >= 0 && genePos < queryGene.length) {
        queryGene[genePos] = AMINOACID_GAP
      }
    }
  }

  // TODO: postcondition(isDivisibleBy(queryGene.length, 3))
  // TODO: postcondition(refGene.length, initialLength))
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
  // TODO: precondition(queryGene == refGene)
  // TODO: precondition(isDivisibleBy(refGene.length, 3))

  const { begin } = gene.range

  for (let pos = 0; pos < queryGene.length; pos += 3) {
    const nucRange: Range = { begin: begin + pos, end: begin + pos + 3 }

    const queryCodon = queryGene.slice(pos, pos + 3)
    const refCodon = refGene.slice(pos, pos + 3)

    const refAA = getCodon(refCodon)
    const queryAA = getCodon(queryCodon)

    if (queryAA === AMINOACID_GAP) {
      aaDeletions.push({ refAA, codon: pos, gene: gene.name, nucRange })
    }

    if (refAA !== queryAA) {
      aaSubstitutions.push({ refAA, queryAA, codon: pos, gene: gene.name, nucRange })
    }
  }
}

/** Extends nucleotide substitutions with information about associated aminoacid substitutions */
export function associateSubstitutions(mutations: NucleotideSubstitution[], aaSubstitutions: AminoacidSubstitution[]) {
  return mutations.map((mut) => {
    // Nuc substitution causes AA substitution iff its position is in the codon range
    const theseAaSubstitutions = aaSubstitutions.filter((aaSub) => inRange(mut.pos, aaSub.nucRange))
    return { ...mut, aaSubstitutions: theseAaSubstitutions }
  })
}

/** Extends nucleotide deletions with information about associated aminoacid deletions */
export function associateDeletions(deletions: NucleotideDeletion[], aaDeletions: AminoacidDeletion[]) {
  return deletions.map((del) => {
    const delRange: Range = { begin: del.start, end: del.length }
    // A nuc deletion causes an AA deletion iff the AA codon nuc range is strictly inside the deletion nuc range
    const theseAaDeletions = aaDeletions.filter((aaSub) => contains({ big: delRange, small: aaSub.nucRange }))
    return { ...del, aaDeletions: theseAaDeletions }
  })
}

export interface GetAllAminoAcidChangesResult {
  aaSubstitutions: AminoacidSubstitution[]
  aaDeletions: AminoacidDeletion[]
  substitutionsWithAA: NucleotideSubstitutionWithAminoacids[]
  deletionsWithAA: NucleotideDeletionWithAminoacids[]
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
    const { refGene, queryGene } = reconstructGeneSequences(gene, refSequence, mutations, deletions)
    addAminoacidChanges(gene, refGene, queryGene, /* out */ aaSubstitutions, /* out */ aaDeletions)
  }

  const substitutionsWithAA = associateSubstitutions(mutations, aaSubstitutions)
  const deletionsWithAA = associateDeletions(deletions, aaDeletions)

  return { aaSubstitutions, aaDeletions, substitutionsWithAA, deletionsWithAA }
}
