export function sanitizeSequence(seq: string) {
  // Trim contiguous Ns in the beginning and end
  return seq // .replace(/N+$/g, '').replace(/^N+/g, '')
}

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
  seqs[currentSeqName + suffix] = sanitizeSequence(currentSeq)
}

export function parseSequences(input: string) {
  // NOTE: This should protect from parsing failures when file is using DOS- and old Mac-style newlines
  const content = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = content.split('\n')
  let currentSeqName = ''
  let currentSeq = ''
  const seqs: Record<string, string> = {}
  const seqNames: string[] = []

  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()

    if (line.startsWith('>')) {
      if (currentSeq.length > 0) {
        addSequence(currentSeq, currentSeqName, seqs, seqNames)
      }
      // eslint-disable-next-line unicorn/prefer-string-slice
      currentSeqName = line.substring(1, line.length)
      currentSeq = ''
    } else {
      // NOTE: Strip all characters except capital letters, asterisks, dots ans question marks
      const seq = line.toUpperCase().replace(/[^*.?A-Z]/g, '')
      currentSeq += seq
    }
  }

  if (currentSeq.length > 0) {
    addSequence(currentSeq, currentSeqName, seqs, seqNames)
  }

  return seqs
}
