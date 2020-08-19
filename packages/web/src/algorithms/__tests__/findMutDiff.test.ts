import { findMutDiff } from 'src/algorithms/tree/locateInTree'
import { AuspiceTreeNode } from 'auspice'
import { AnalysisResult } from 'src/algorithms/types'

const refNuc = "Can't touch this"

describe('findMutDiff', () => {
  it('should return empty for empty sets', () => {
    const ref = ({
      mutations: new Map<number, string>(),
    } as unknown) as AuspiceTreeNode

    const query = ({
      substitutions: [],
    } as unknown) as AnalysisResult

    expect(findMutDiff(ref, query)).toStrictEqual([])
  })

  it('should return empty for matching single element sets', () => {
    const ref = ({
      mutations: new Map<number, string>([[123, 'B']]),
    } as unknown) as AuspiceTreeNode

    const query = {
      substitutions: [{ pos: 123, queryNuc: 'B', refNuc }],
    } as AnalysisResult

    expect(findMutDiff(ref, query)).toStrictEqual([])
  })

  it('should return query for disjoint single element sets', () => {
    const ref = ({
      mutations: new Map<number, string>([[123, 'A']]),
    } as unknown) as AuspiceTreeNode

    const query = {
      substitutions: [{ pos: 123, queryNuc: 'B', refNuc }],
    } as AnalysisResult

    expect(findMutDiff(ref, query)).toStrictEqual(query.substitutions)
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

    expect(findMutDiff(ref, query)).toStrictEqual(query.substitutions)
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

    expect(findMutDiff(ref, query)).toStrictEqual([])
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

    expect(findMutDiff(ref, query)).toStrictEqual([
      { pos: 123, queryNuc: 'B', refNuc },
      { pos: 679, queryNuc: 'Z', refNuc },
      { pos: 45875, queryNuc: 'Z', refNuc },
    ])
  })
})
