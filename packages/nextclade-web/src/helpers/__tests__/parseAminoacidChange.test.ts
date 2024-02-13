import { parseAminoacidChange } from 'src/helpers/parseAminoacidChange'

describe('parseAminoacidChange', () => {
  it('should parse gene, ref, position, query', () => {
    expect(parseAminoacidChange('Gene1:V123S')).toStrictEqual({ gene: 'Gene1', refAA: 'V', codon: 122, queryAA: 'S' })
  })

  it('should parse different gene, ref, position, query', () => {
    expect(parseAminoacidChange('ORF1a:T2153I')).toStrictEqual({ gene: 'ORF1a', refAA: 'T', codon: 2152, queryAA: 'I' })
  })

  it('should parse ref', () => {
    expect(parseAminoacidChange(':V')).toStrictEqual({
      gene: undefined,
      refAA: 'V',
      codon: undefined,
      queryAA: undefined,
    })
  })

  it('should parse position', () => {
    expect(parseAminoacidChange(':123')).toStrictEqual({
      gene: undefined,
      refAA: undefined,
      codon: 122,
      queryAA: undefined,
    })
  })

  it('should parse position, query', () => {
    expect(parseAminoacidChange(':123V')).toStrictEqual({
      gene: undefined,
      refAA: undefined,
      codon: 122,
      queryAA: 'V',
    })
  })

  it('should parse ref, query', () => {
    expect(parseAminoacidChange(':VS')).toStrictEqual({
      gene: undefined,
      refAA: 'V',
      codon: undefined,
      queryAA: 'S',
    })
  })

  it('should parse any, query', () => {
    expect(parseAminoacidChange(':.S')).toStrictEqual({
      gene: undefined,
      refAA: undefined,
      codon: undefined,
      queryAA: 'S',
    })
  })

  it('should parse ref, position', () => {
    expect(parseAminoacidChange(':V123')).toStrictEqual({
      gene: undefined,
      refAA: 'V',
      codon: 122,
      queryAA: undefined,
    })
  })

  it('should parse skip, position, query', () => {
    expect(parseAminoacidChange(':.123S')).toStrictEqual({
      gene: undefined,
      refAA: undefined,
      codon: 122,
      queryAA: 'S',
    })
  })

  it('should parse genes skip, ref, position, query', () => {
    expect(parseAminoacidChange('.:V123S')).toStrictEqual({
      gene: undefined,
      refAA: 'V',
      codon: 122,
      queryAA: 'S',
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
