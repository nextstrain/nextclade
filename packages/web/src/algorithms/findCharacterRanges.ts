export interface SubstringRange {
  begin: number
  end: number
}

export interface SubstringMatch {
  character: string
  range: SubstringRange
}

export function findCharacterRanges(str: string, characters: string): SubstringMatch[] {
  if (characters.length === 0) {
    throw new Error(`findCharacterRanges: expected a character to search for, but got an empty string`)
  }

  if (process.env.NODE_ENV === 'development' && str.length === 0) {
    console.warn(`findCharacterRanges: the searched string is empty. This is not an error by itself, but may indicate bugs in the caller code`) // prettier-ignore
  }

  const result: SubstringMatch[] = []

  // TODO: make more efficient
  const numC = characters.length
  for (let c = 0; c < numC; ++c) {
    const character = characters[c]

    const length = str.length
    let begin: number | undefined = undefined
    for (let i = 0; i < length; ++i) {
      if (character === str[i]) {
        begin = begin ? begin : i
      } else if (begin) {
        const end = i
        result.push({ character, range: { begin, end } })
        begin = undefined
      }
    }
  }

  return result
}
