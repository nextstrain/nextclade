import { mergeByWith } from 'src/helpers/mergeByWith'

const predicate = (a: { name?: string }, b: { name?: string }) => a?.name === b?.name

const merger = (a: { values: { val: unknown } }, b: { extra: unknown }) => ({
  ...a,
  values: { ...a.values, extra: b.extra },
})

describe('mergeWith', () => {
  it('merges empty', () => {
    expect(mergeByWith([], [], predicate)).toStrictEqual([])
  })

  it('merges with object spread by default', () => {
    const one = [
      { name: 'a', val: 'foo' },
      { name: 'b', val: 'bar' },
      { name: 'c', val: 'baz' },
    ]

    const two = [
      { name: 'a', extra: 'hello' },
      { name: 'b', extra: 35 },
      { name: 'd', extra: true },
    ]

    const expected = [
      { name: 'a', val: 'foo', extra: 'hello' },
      { name: 'b', val: 'bar', extra: 35 },
      { name: 'c', val: 'baz' },
    ]

    expect(mergeByWith(one, two, predicate)).toStrictEqual(expected)
  })

  it('merges with custom merger function', () => {
    const one = [
      { name: 'a', values: { val: 'foo' } },
      { name: 'b', values: { val: 'bar' } },
      { name: 'c', values: { val: 'baz' } },
    ]

    const two = [
      { name: 'a', extra: 'hello' },
      { name: 'b', extra: 35 },
      { name: 'd', extra: true },
    ]

    const expected = [
      { name: 'a', values: { val: 'foo', extra: 'hello' } },
      { name: 'b', values: { val: 'bar', extra: 35 } },
      { name: 'c', values: { val: 'baz' } },
    ]

    expect(mergeByWith(one, two, predicate, merger)).toStrictEqual(expected)
  })
})
