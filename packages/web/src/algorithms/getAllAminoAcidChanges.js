import { codonTable } from './codonTable'

export function aminoAcidChange(pos, queryAllele, refSequence, gene) {
  // check that the positions is infact part of this gene
  if (pos < gene.start && pos >= gene.end) {
    return
  }

  // determine the reading frame and codon number in gene.
  const frame = (pos - gene.start + 1) % 3
  const genPos = (pos - gene.start + 1 - frame) / 3
  // pull out the codons and construct the query codon by inserting the allele
  const refCodon = refSequence.substring(pos - frame, pos - frame + 3)
  const queryCodon = refCodon.substring(0, frame) + queryAllele + refCodon.substring(frame + 1, 3)

  return { refAA: codonTable[refCodon], queryAA: codonTable[queryCodon], codon: genPos }
}

export function getAllAminoAcidChanges(pos, queryAllele, refSequence, geneMap) {
  const aminoAcidChanges = []
  geneMap.forEach((gene) => {
    if (pos >= gene.start && pos < gene.end) {
      aminoAcidChanges.push(aminoAcidChange(pos, queryAllele, refSequence, gene))
    }
  })
  return aminoAcidChanges.filter((mut) => mut.refAA !== mut.queryAA)
}
