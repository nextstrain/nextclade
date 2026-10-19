import { parseAminoacidChange } from 'src/helpers/parseAminoacidChange'

describe('parseAminoacidChange', () => {
  it('should parse gene, ref, position, query', () => {
    expect(parseAminoacidChange('Gene1:V123S')).toStrictEqual({ cdsName: 'Gene1', refAa: 'V', pos: 122, qryAa: 'S' })
  })

  it('should parse different gene, ref, position, query', () => {
    expect(parseAminoacidChange('ORF1a:T2153I')).toStrictEqual({ cdsName: 'ORF1a', refAa: 'T', pos: 2152, qryAa: 'I' })
  })

  it('should parse ref', () => {
    expect(parseAminoacidChange(':V')).toStrictEqual({
      cdsName: undefined,
      refAa: 'V',
      pos: undefined,
      qryAa: undefined,
    })
  })

  it('should parse position', () => {
    expect(parseAminoacidChange(':123')).toStrictEqual({
      cdsName: undefined,
      refAa: undefined,
      pos: 122,
      qryAa: undefined,
    })
  })

  it('should parse position, query', () => {
    expect(parseAminoacidChange(':123V')).toStrictEqual({
      cdsName: undefined,
      refAa: undefined,
      pos: 122,
      qryAa: 'V',
    })
  })

  it('should parse ref, query', () => {
    expect(parseAminoacidChange(':VS')).toStrictEqual({
      cdsName: undefined,
      refAa: 'V',
      pos: undefined,
      qryAa: 'S',
    })
  })

  it('should parse any, query', () => {
    expect(parseAminoacidChange(':.S')).toStrictEqual({
      cdsName: undefined,
      refAa: undefined,
      pos: undefined,
      qryAa: 'S',
    })
  })

  it('should parse ref, position', () => {
    expect(parseAminoacidChange(':V123')).toStrictEqual({
      cdsName: undefined,
      refAa: 'V',
      pos: 122,
      qryAa: undefined,
    })
  })

  it('should parse skip, position, query', () => {
    expect(parseAminoacidChange(':.123S')).toStrictEqual({
      cdsName: undefined,
      refAa: undefined,
      pos: 122,
      qryAa: 'S',
    })
  })

  it('should parse genes skip, ref, position, query', () => {
    expect(parseAminoacidChange('.:V123S')).toStrictEqual({
      cdsName: undefined,
      refAa: 'V',
      pos: 122,
      qryAa: 'S',
    })
  })
})

describe('parseAminoacidChange reject', () => {
  it('should reject empty input', () => {
    expect(parseAminoacidChange('')).toBeUndefined()
  })

  it('should reject non-mutation-like input', () => {
    expect(parseAminoacidChange('hello!')).toBeUndefined()
  })

  it('should reject any', () => {
    expect(parseAminoacidChange(':.')).toBeUndefined()
  })

  it('should reject any, any', () => {
    expect(parseAminoacidChange(':..')).toBeUndefined()
  })

  it('should reject any gene, any', () => {
    expect(parseAminoacidChange('.:.')).toBeUndefined()
  })

  it('should reject any gene, any, any', () => {
    expect(parseAminoacidChange('.:..')).toBeUndefined()
  })

  it('should reject multiple letters in ref', () => {
    expect(parseAminoacidChange(':VF.')).toBeUndefined()
  })

  it('should reject multiple letters in query', () => {
    expect(parseAminoacidChange(':.SA')).toBeUndefined()
  })

  it('should reject letters in position', () => {
    expect(parseAminoacidChange(':G1X3T')).toBeUndefined()
  })

  it('should reject dots in position', () => {
    expect(parseAminoacidChange(':A.C')).toBeUndefined()
  })
})
