/**
 * Catches duplicate names and renames if needed (appends a counter)
 */
export function deduplicateSeqName(seqNameOrig: string, seqNames: Map<string, number>) {
  let seqName = seqNameOrig
  if (seqNameOrig === '') {
    seqName = 'Untitled'
  }

  const nameCount = seqNames.get(seqName) ?? 0
  if (nameCount > 0) {
    seqName = `${seqName} (${nameCount})`
  }
  seqNames.set(seqName, nameCount + 1)

  return seqName
}

export function addSequence(
  currentSeq: string,
  currentSeqName: string,
  seqs: Record<string, string>,
  seqNames: Map<string, number>,
) {
  const seqName = deduplicateSeqName(currentSeqName, seqNames)
  seqs[seqName] = currentSeq
}

export function sanitizeSequence(seq: string) {
  return seq.toUpperCase().replace(/[^*.?A-Z]/g, '')
}

export function parseSequences(input: string) {
  // NOTE: This should protect from parsing failures when file is using DOS- and old Mac-style newlines
  const content = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = content.split('\n')
  let currentSeqName = ''
  let currentSeq = ''
  const seqs: Record<string, string> = {}
  const seqNames = new Map<string, number>()

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
      const seq = sanitizeSequence(line)
      currentSeq += seq
    }
  }

  if (currentSeq.length > 0) {
    addSequence(currentSeq, currentSeqName, seqs, seqNames)
  }

  return seqs
}
