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
import { GAP } from './nucleotides'
import { AMINOACID_GAP, getCodon } from './codonTable'
import { haveIntersectionStrict, inRange } from './haveIntersectionStrict'

export enum PatchDirection {
  left,
  right,
}

const DEFAULT_PATCH_DIRECTION = PatchDirection.left

export interface PreferredPatchDirectionDatum {
  geneName: string
  delStart: number
  patchDirection: PatchDirection
}

// look up preferred codon patching by gene name and deletion start
const KNOWN_PREFERRED_PATCH_DIRECTIONS: PreferredPatchDirectionDatum[] = [
  { geneName: 'S', delStart: 21993, patchDirection: PatchDirection.right },
  { geneName: 'S', delStart: 21983, patchDirection: PatchDirection.right },
  { geneName: 'S', delStart: 21980, patchDirection: PatchDirection.right },
]

export function getPatchDirection(geneName: string, delStart: number): PatchDirection {
  const foundDirection = KNOWN_PREFERRED_PATCH_DIRECTIONS.find(
    (candidate) => candidate.geneName === geneName && candidate.delStart === delStart,
  )
  return foundDirection?.patchDirection ?? DEFAULT_PATCH_DIRECTION
}

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
    const frame = (begin - geneBegin) % 3

    // TODO: invariant(begin > 0)
    // TODO: invariant(begin <= end)
    // TODO: invariant(end - begin <= queryGene.length)

    // handle out-of-frame but not frame-shifting deletions
    const patchDirection = getPatchDirection(gene.name, begin)
    const isOutOfFrameButNotShifting = frame > 0 && delLength % 3 === 0
    if (isOutOfFrameButNotShifting && patchDirection === PatchDirection.left) {
      let genePos = begin - geneBegin
      for (let pos = end - (3 - frame); pos < end; ++pos) {
        if (genePos >= 0 && genePos < queryGene.length) {
          queryGene[genePos] = queryGene[genePos + delLength]
        }
        genePos++
      }
      for (let gap = 0; gap < delLength; ++gap) {
        if (genePos >= 0 && genePos < queryGene.length) {
          queryGene[genePos] = GAP
        }
        genePos++
      }
    } else if (isOutOfFrameButNotShifting && patchDirection === PatchDirection.right) {
      let genePos = begin - geneBegin - frame + delLength
      for (let pos = begin - frame; pos < begin; ++pos) {
        if (genePos >= 0 && genePos < queryGene.length) {
          queryGene[genePos] = queryGene[genePos - delLength]
        }
        genePos++
      }
      genePos = begin - geneBegin - frame
      for (let gap = 0; gap < delLength; ++gap) {
        if (genePos >= 0 && genePos < queryGene.length) {
          queryGene[genePos] = GAP
        }
        genePos++
      }
    } else {
      // Fill deletion range with gaps
      for (let pos = begin; pos < end; ++pos) {
        const genePos = pos - geneBegin // Position relative to the gene start
        if (genePos >= 0 && genePos < queryGene.length) {
          queryGene[genePos] = GAP
        }
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

    // TODO: invariant(isDivisibleBy(codon, 3))
    const codon = pos / 3

    if (queryAA === AMINOACID_GAP) {
      aaDeletions.push({ refAA, codon, gene: gene.name, nucRange, refCodon })
    } else if (refAA !== queryAA) {
      aaSubstitutions.push({ refAA, queryAA, codon, gene: gene.name, nucRange, refCodon, queryCodon })
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
    const delRange: Range = { begin: del.start, end: del.start + del.length }
    // A nuc deletion causes an AA deletion iff the AA codon nuc range is strictly inside the deletion nuc range
    const theseAaDeletions = aaDeletions.filter((aaDel) => haveIntersectionStrict(delRange, aaDel.nucRange))
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
