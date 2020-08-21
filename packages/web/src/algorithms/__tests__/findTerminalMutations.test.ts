import { findPrivateMutations } from 'src/algorithms/tree/treeFindNearestNodes'
import { AuspiceTreeNode } from 'auspice'
import { AnalysisResult } from 'src/algorithms/types'
import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'

const rootSeq = DEFAULT_ROOT_SEQUENCE
const refNuc = "Can't touch this"

describe('findPrivateMutations', () => {
  it('should return empty for empty sets', () => {
    const ref = ({
      mutations: new Map<number, string>(),
    } as unknown) as AuspiceTreeNode

    const query = ({
      substitutions: [],
    } as unknown) as AnalysisResult

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([])
  })

  it('should return empty for matching single element sets', () => {
    const ref = ({
      mutations: new Map<number, string>([[123, 'B']]),
    } as unknown) as AuspiceTreeNode

    const query = {
      substitutions: [{ pos: 123, queryNuc: 'B', refNuc }],
    } as AnalysisResult

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([])
  })

  it('should return query for disjoint single element sets', () => {
    const ref = ({
      mutations: new Map<number, string>([[123, 'A']]),
    } as unknown) as AuspiceTreeNode

    const query = {
      substitutions: [{ pos: 123, queryNuc: 'B', refNuc }],
    } as AnalysisResult

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual(query.substitutions)
  })

  it('should return query for disjoint sets', () => {
    const ref = ({
      mutations: new Map<number, string>([
        [123, 'A'],
        [456, 'B'],
        [789, 'C'],
      ]),
    } as unknown) as AuspiceTreeNode

    const query = {
      substitutions: [
        { pos: 123, queryNuc: 'C', refNuc },
        { pos: 777, queryNuc: 'B', refNuc },
        { pos: 789, queryNuc: 'A', refNuc },
      ],
    } as AnalysisResult

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual(query.substitutions)
  })

  it('should return empty for same sets', () => {
    const ref = ({
      mutations: new Map<number, string>([
        [123, 'B'],
        [567, 'C'],
        [679, 'Z'],
        [45875, 'Z'],
      ]),
    } as unknown) as AuspiceTreeNode

    const query = {
      substitutions: [
        { pos: 123, queryNuc: 'B', refNuc },
        { pos: 567, queryNuc: 'C', refNuc },
        { pos: 679, queryNuc: 'Z', refNuc },
        { pos: 45875, queryNuc: 'Z', refNuc },
      ],
    } as AnalysisResult

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([])
  })

  it('should return multiple elements in general case', () => {
    const ref = ({
      mutations: new Map<number, string>([
        [123, 'A'],
        [111, 'B'],
        [567, 'C'],
        [679, 'N'],
        [333, 'Z'],
        [45874, 'Z'],
        [45875, 'A'],
      ]),
    } as unknown) as AuspiceTreeNode

    const query = {
      substitutions: [
        { pos: 123, queryNuc: 'B', refNuc },
        { pos: 567, queryNuc: 'C', refNuc },
        { pos: 679, queryNuc: 'Z', refNuc },
        { pos: 45875, queryNuc: 'Z', refNuc },
      ],
    } as AnalysisResult

    expect(findPrivateMutations(ref, query, rootSeq)).toStrictEqual([
      { pos: 123, queryNuc: 'B', refNuc },
      { pos: 679, queryNuc: 'Z', refNuc },
      { pos: 45875, queryNuc: 'Z', refNuc },
    ])
  })
})
