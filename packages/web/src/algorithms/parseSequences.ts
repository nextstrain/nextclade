export function addSequence(
  currentSeq: string,
  currentSeqName: string,
  seqs: Record<string, string>,
  allNames: string[],
) {
  if (currentSeqName === '') {
    // eslint-disable-next-line no-param-reassign
    currentSeqName = 'Untitled'
  }

  let nameCount = 0
  for (let i = 0; i < allNames.length; ++i) {
    if (allNames[i] === currentSeqName) {
      ++nameCount
    }
  }

  let suffix = ''
  if (nameCount) {
    suffix = ` (${nameCount})`
  }

  allNames.push(currentSeqName)
  seqs[currentSeqName + suffix] = currentSeq
}

export function parseSequences(input: string) {
  const lines = input.split('\n')

  let currentSeqName = ''
  let currentSeq = ''
  const seqs: Record<string, string> = {}
  const seqNames: string[] = []

  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i]
    if (line.startsWith('>')) {
      if (currentSeq.length > 0) {
        addSequence(currentSeq, currentSeqName, seqs, seqNames)
      }
      // eslint-disable-next-line unicorn/prefer-string-slice
      currentSeqName = line.substring(1, line.length)
      currentSeq = ''
    } else {
      currentSeq += line.toUpperCase()
    }
  }

  if (currentSeq.length > 0) {
    addSequence(currentSeq, currentSeqName, seqs, seqNames)
  }

  return seqs
}
