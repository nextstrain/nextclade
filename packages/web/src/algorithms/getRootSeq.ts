import DEFAULT_ROOT_SEQUENCE_RAW from 'src/assets/data/defaultRootSequence.txt'

function getRootSequence(): string {
  return DEFAULT_ROOT_SEQUENCE_RAW.trim()
}

export const DEFAULT_ROOT_SEQUENCE = getRootSequence()
