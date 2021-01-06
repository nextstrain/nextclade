/* eslint-disable unicorn/prefer-string-slice */
import { isMatch } from './nucleotideCodes'

export class ErrorAlignmentSequenceTooShort extends Error {
  public constructor() {
    super('Unable to align: sequence is too short')
  }
}

export class ErrorAlignmentNoSeedMatches extends Error {
  public constructor() {
    super('Unable to align: no seed matches')
  }
}

export class ErrorAlignmentBadSeedMatches extends Error {
  public constructor() {
    super('Unable to align: too many insertions, deletions, duplications, or ambiguous seed matches')
  }
}

interface SeedMatch {
  shift: number
  score: number
}

interface SeedAlignment {
  meanShift: number
  bandWidth: number
}

interface ForwardTrace {
  scores: Int32Array[]
  paths: Int32Array[]
}

interface Alignment {
  query: string[]
  ref: string[]
  alignmentScore: number
}

export const alignmentParameters = {
  gapExtend: 0,
  gapOpen: -2,
  gapClose: -2,
  misMatch: -1,
  match: 3,
}

// determine the position where a particular kmer (string of length k) matches the reference sequence
function seedMatch(kmer: string, ref: string, searchStart: number): SeedMatch {
  let tmpScore = 0
  let maxScore = 0
  let maxShift = -1
  for (let shift = searchStart; shift < ref.length - kmer.length; shift++) {
    tmpScore = 0
    for (let pos = 0; pos < kmer.length; pos++) {
      if (kmer[pos] === ref[shift + pos]) {
        tmpScore++
      }
    }
    if (tmpScore > maxScore) {
      maxScore = tmpScore
      maxShift = shift
    }
  }
  return { shift: maxShift, score: maxScore }
}

function seedAlignment(query: string, ref: string): SeedAlignment {
  const nSeeds = 29
  const seedLength = 21
  const margin = ref.length > 3000 ? 30 : Math.round(ref.length / 100)
  const bandWidth = Math.min(ref.length, query.length)

  if (bandWidth < 2 * seedLength) {
    return { meanShift: 0, bandWidth }
  }

  const mapToGoodPositions = []
  let distanceToLastBadPos = 0
  for (let i = 0; i < query.length; i++) {
    if (query[i] === 'N') {
      distanceToLastBadPos = -1
    } else if (distanceToLastBadPos > seedLength) {
      mapToGoodPositions.push(i - seedLength)
    }
    distanceToLastBadPos += 1
  }
  const numberOfGoodPositions = mapToGoodPositions.length

  const seedMatches = []
  let searchStart = 0
  for (let ni = 0; ni < nSeeds; ni++) {
    // generate kmers equally spaced on the query
    const qPos = mapToGoodPositions[Math.round(margin + ((numberOfGoodPositions - 2 * margin) / (nSeeds - 1)) * ni)]
    const tmpMatch = seedMatch(query.substring(qPos, qPos + seedLength), ref, searchStart)
    // only use seeds that match at least 70%
    if (tmpMatch.score >= 0.9 * seedLength) {
      seedMatches.push([qPos, tmpMatch.shift, tmpMatch.shift - qPos, tmpMatch.score])
      searchStart = tmpMatch.shift
    }
  }

  if (seedMatches.length < 2) {
    throw new ErrorAlignmentNoSeedMatches()
  }

  // given the seed matches, determine the maximal and minimal shifts
  // this shift is the typical amount the query needs shifting to match ref
  // ref:   ACTCTACTGC-TCAGAC
  // query: ----TCACTCATCT-ACACCGAT  => shift = 4, then 3, 4 again
  const minShift = Math.min(...seedMatches.map((d) => d[2]))
  const maxShift = Math.max(...seedMatches.map((d) => d[2]))
  return { bandWidth: maxShift - minShift + 9, meanShift: Math.round(0.5 * (minShift + maxShift)) }
}

// self made argmax function
function argmax(d: number[]) {
  let tmpmax = d[0]
  let tmpii = 0
  d.forEach((x, i) => {
    if (x > tmpmax) {
      tmpmax = x
      tmpii = i
    }
  })
  return [tmpii, tmpmax]
}

function scoreMatrix(query: string, ref: string, bandWidth: number, meanShift: number): ForwardTrace {
  function indexToShift(si: number): number {
    return si - bandWidth + meanShift
  }

  // allocate a matrix to record the matches
  const rowLength = ref.length + 1
  const scores = []
  const paths = []
  for (let shift = -bandWidth; shift < bandWidth + 1; shift++) {
    scores.push(new Int32Array(rowLength))
    paths.push(new Int32Array(rowLength))
  }

  // fill scores with alignment scores
  // The inner index scores[][ri] is the index of the reference sequence
  // the outer index si index the shift, together they define rPos=ri and qPos = ri-shift
  // if the colon marks the position in the sequence before rPos,qPos
  // R: ...ACT:X
  // Q: ...ACT:Y
  // 1) if X and Y are bases they either match or mismatch. shift doesn't change, rPos and qPos advance
  //    -> right horizontal step in the matrix
  // 2) if X is '-' and Y is a base, rPos stays the same and the shift decreases
  //    -> vertical step in the matrix from si+1 to si
  // 2) if X is a base and Y is '-', rPos advances the same and the shift increases
  //    -> diagonal step in the matrix from (ri,si-1) to (ri+1,si)
  const { gapExtend, gapOpen, gapClose, misMatch, match } = alignmentParameters
  const END_OF_SEQUENCE = -1
  let si
  let ri
  let shift
  let tmpMatch
  let cmp
  let qPos
  let origin
  let score
  let qGapOpen
  let rGapOpen
  for (ri = 0; ri < ref.length; ri++) {
    for (si = 2 * bandWidth; si >= 0; si--) {
      shift = indexToShift(si)
      qPos = ri - shift

      if (qPos < 0) {
        // preceeds query sequence -- no score, origin is query gap
        score = 0
        origin = 3
      } else if (qPos < query.length) {
        // if the shifted position is within the query sequence
        tmpMatch = isMatch(query[qPos], ref[ri]) ? match : misMatch
        if (paths[si][ri] === 2 || paths[si][ri] === 3) {
          tmpMatch += gapClose
        }

        // determine whether the previous move was a reference or query gap
        rGapOpen = si < 2 * bandWidth ? (paths[si + 1][ri + 1] === 2 ? 0 : gapOpen) : 0
        qGapOpen = si > 0 ? (paths[si - 1][ri] === 3 ? 0 : gapOpen) : 0

        // calculate scores
        cmp = [
          0, // unaligned
          scores[si][ri] + tmpMatch, // match -- shift stays the same
          si < 2 * bandWidth ? scores[si + 1][ri + 1] + gapExtend + rGapOpen : gapExtend, // putting a gap into ref
          si > 0 ? scores[si - 1][ri] + gapExtend + qGapOpen : gapExtend, // putting a gap into query
        ]
        // determine best move and best score
        ;[origin, score] = argmax(cmp)
      } else {
        // past query sequence -- mark as sequence end
        score = END_OF_SEQUENCE
        origin = END_OF_SEQUENCE
      }
      paths[si][ri + 1] = origin
      scores[si][ri + 1] = score
    }
  }

  return { scores, paths }
}

function backTrace(
  query: string,
  ref: string,
  scores: Int32Array[],
  paths: Int32Array[],
  meanShift: number,
): Alignment {
  const bandWidth = (scores.length - 1) / 2
  const rowLength = scores[0].length
  function indexToShift(si: number): number {
    return si - bandWidth + meanShift
  }

  // Determine the best alignment by picking the optimal score at the end of the query
  const aln = []
  const lastIndexByShift = scores.map((d, i) => Math.min(rowLength - 1, query.length + indexToShift(i)))
  const lastScoreByShift = scores.map((d, i) => d[lastIndexByShift[i]])

  let si = argmax(lastScoreByShift)[0]
  const shift = indexToShift(si)
  const bestScore = lastScoreByShift[si]
  let origin

  // determine position tuple qPos, rPos corresponding to the place it the matrix
  let rPos = lastIndexByShift[si] - 1
  let qPos = rPos - shift
  // add right overhang, i.e. unaligned parts of the query or reference the right end
  if (rPos < ref.length - 1) {
    for (let ii = ref.length - 1; ii > rPos; ii--) {
      aln.push(['-', ref[ii]])
    }
  } else if (qPos < query.length - 1) {
    for (let ii = query.length - 1; ii > qPos; ii--) {
      aln.push([query[ii], '-'])
    }
  }

  // do backtrace for aligned region
  while (rPos > 0 && qPos > 0) {
    // tmpMatch = ref[rPos] === query[qPos] || query[qPos] === "N" ? match : misMatch;
    origin = paths[si][rPos + 1]
    if (origin === 1) {
      // match -- decrement both strands and add match to alignment
      aln.push([query[qPos], ref[rPos]])
      qPos--
      rPos--
    } else if (origin === 2) {
      // insertion in query -- decrement query, increase shift
      aln.push([query[qPos], '-'])
      qPos--
      si++
    } else if (origin === 3) {
      // deletion in query -- decrement reference, reduce shift
      aln.push(['-', ref[rPos]])
      rPos--
      si--
    } else {
      break
    }
  }
  // add the last match
  aln.push([query[qPos], ref[rPos]])

  // add left overhang
  if (rPos > 0) {
    for (let ii = rPos - 1; ii >= 0; ii--) {
      aln.push(['-', ref[ii]])
    }
  } else if (qPos > 0) {
    for (let ii = qPos - 1; ii >= 0; ii--) {
      aln.push([query[ii], '-'])
    }
  }

  // reverse and make sequence
  aln.reverse()
  return {
    query: aln.map((d) => d[0]),
    ref: aln.map((d) => d[1]),
    alignmentScore: bestScore,
  }
}

export function alignPairwise(query: string, ref: string, minimalLength: number): Alignment {
  if (query.length < minimalLength) {
    throw new ErrorAlignmentSequenceTooShort()
  }

  const debug = false

  // console.log(query);
  // console.log(ref);
  // perform a number of seed matches to determine te rough alignment of query rel to ref
  const { bandWidth, meanShift } = seedAlignment(query, ref)
  if (bandWidth > 400) {
    throw new ErrorAlignmentBadSeedMatches()
  }
  const { paths, scores } = scoreMatrix(query, ref, bandWidth, meanShift)

  if (debug) {
    if (scores.length < 20) {
      console.info('MM')
      console.info(scores.map((d) => d.join('\t')).join('\n'))
      console.info('D')
      console.info(paths.map((d) => d.join('\t')).join('\n'))
    } else {
      console.info('MM', scores)
    }
  }

  return backTrace(query, ref, scores, paths, meanShift)
}
