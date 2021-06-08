/* eslint-disable no-loops/no-loops,no-plusplus */
import copy from 'fast-copy'
import { AMINOACID_GAP } from 'src/constants'
import type { AminoacidDeletion, AminoacidSubstitution, Range } from 'src/algorithms/types'

import { sumBy } from 'lodash'

export interface AminoacidChange extends AminoacidSubstitution {
  type: 'substitution' | 'deletion'
}

export function mergeContext(left: string, right: string) {
  // precondition left.slice(3, 9) === right.slice(0, 6)

  // left:    aaa bbb ccc
  // right:       bbb ccc ddd
  // result:  aaa bbb ccc ddd

  return left.slice(0, -3) + right.slice(3, 9)
}

export class AminoacidChangesGroup {
  public gene: string
  public codonAaRange: Range
  public codonNucRange: Range
  public changes: AminoacidChange[]
  public refContext: string
  public queryContext: string
  public contextNucRange: Range
  public numSubstitutions: number
  public numDeletions: number

  private updateCounts() {
    this.numSubstitutions = sumBy(this.changes, (change) => Number(change.type === 'substitution'))
    this.numDeletions = sumBy(this.changes, (change) => Number(change.type === 'deletion'))
  }

  public constructor(change: AminoacidChange) {
    this.gene = copy(change.gene)
    this.codonAaRange = { begin: change.codon, end: change.codon + 1 }
    this.codonNucRange = copy(change.codonNucRange)
    this.changes = [copy(change)]
    this.queryContext = change.queryContext
    this.refContext = copy(change.refContext)
    this.contextNucRange = copy(change.contextNucRange)
    this.numSubstitutions = 0
    this.numDeletions = 0
    this.updateCounts()
  }

  public add(change: AminoacidChange): void {
    // precondition_equal(change.gene === this.gene)
    // precondition_less(changes[changes.length - 1].codon, change.codon) // changes should be sorted by codon

    this.codonAaRange.end = change.codon + 1
    this.codonNucRange.end = change.contextNucRange.end
    this.changes.push(change)
    this.refContext = mergeContext(this.refContext, change.refContext)
    this.queryContext = mergeContext(this.queryContext, change.queryContext)
    this.contextNucRange.end = change.contextNucRange.end
    this.updateCounts()
  }
}

export function groupAdjacentAminoacidChanges(aaSubs: AminoacidSubstitution[], aaDels: AminoacidDeletion[]) {
  const subs: AminoacidChange[] = aaSubs.map((substitution) => ({ ...substitution, type: 'substitution' }))
  const dels: AminoacidChange[] = aaDels.map((deletion) => ({ ...deletion, type: 'deletion', queryAA: AMINOACID_GAP }))
  const changes: AminoacidChange[] = [...subs, ...dels].sort((left, right) => left.codon - right.codon)

  if (changes.length === 0) {
    return []
  }

  const firstGroup = new AminoacidChangesGroup(changes[0])
  const groups = [firstGroup]

  for (let i = 1; i < changes.length; ++i) {
    const prev = changes[i - 1]
    const curr = changes[i]
    const group = groups[groups.length - 1]

    if (curr.codon - prev.codon === 1) {
      group.add(curr)
    } else {
      groups.push(new AminoacidChangesGroup(curr))
    }
  }

  return groups
}
