import type { AnalysisResult } from 'src/algorithms/types'
import type { AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { findPrivateMutations } from 'src/algorithms/tree/treeFindNearestNodes'
import { getVirus } from 'src/algorithms/defaults/viruses'

const { rootSeq } = getVirus()
const refNuc = "Can't touch this"

function makeRef(mutationEntries: [number, string][]) {
  const mutations = new Map<number, string>(mutationEntries)
  return { mutations, substitutions: mutations } as AuspiceTreeNodeExtended
}

function makeQuery(substitutions: { pos: number; queryNuc: string; refNuc: string }[]) {
  return { substitutions } as AnalysisResult
}

describe('findPrivateMutations', () => {
  it('should return empty for empty sets', () => {
    const ref = makeRef([])
    const query = makeQuery([])
    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([])
  })

  it('should return empty for matching single element sets', () => {
    const ref = makeRef([[123, 'B']])
    const query = makeQuery([{ pos: 123, queryNuc: 'B', refNuc }])
    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([])
  })

  it('should return query for disjoint single element sets', () => {
    const ref = makeRef([[123, 'A']])
    const query = makeQuery([{ pos: 123, queryNuc: 'B', refNuc }])
    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual(query.substitutions)
  })

  it('should return query for disjoint sets', () => {
    const ref = makeRef([
      [123, 'A'],
      [456, 'B'],
      [789, 'C'],
    ])

    const query = makeQuery([
      { pos: 123, queryNuc: 'C', refNuc },
      { pos: 777, queryNuc: 'B', refNuc },
      { pos: 789, queryNuc: 'A', refNuc },
    ])

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual(query.substitutions)
  })

  it('should return empty for same sets', () => {
    const ref = makeRef([
      [123, 'B'],
      [567, 'C'],
      [679, 'Z'],
      [45875, 'Z'],
    ])

    const query = makeQuery([
      { pos: 123, queryNuc: 'B', refNuc },
      { pos: 567, queryNuc: 'C', refNuc },
      { pos: 679, queryNuc: 'Z', refNuc },
      { pos: 45875, queryNuc: 'Z', refNuc },
    ])

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([])
  })

  it('should return multiple elements in general case', () => {
    const ref = makeRef([
      [123, 'A'],
      [111, 'B'],
      [567, 'C'],
      [679, 'N'],
      [333, 'Z'],
      [45874, 'Z'],
      [45875, 'A'],
    ])

    const query = makeQuery([
      { pos: 123, queryNuc: 'B', refNuc },
      { pos: 567, queryNuc: 'C', refNuc },
      { pos: 679, queryNuc: 'Z', refNuc },
      { pos: 45875, queryNuc: 'Z', refNuc },
    ])

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([
      { pos: 123, queryNuc: 'B', refNuc },
      { pos: 679, queryNuc: 'Z', refNuc },
      { pos: 45875, queryNuc: 'Z', refNuc },
    ])
  })
})
