import { sanitizeRootSeq } from 'src/helpers/sanitizeRootSeq'

import DEFAULT_ROOT_SEQUENCE_RAW from './rootSeq.txt'

export const rootSeq = sanitizeRootSeq(DEFAULT_ROOT_SEQUENCE_RAW)
