import DEFAULT_ROOT_SEQUENCE_RAW from './rootSeq.txt'

function getRootSequence(): string {
  return DEFAULT_ROOT_SEQUENCE_RAW.trim()
}

export const rootSeq = getRootSequence()
