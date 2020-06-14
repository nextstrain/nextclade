import * as d3 from 'd3'

export function alignPairwise(query, ref) {
  const debug = false
  // self made argmax function
  function argmax(d) {
    let tmpmax = d[0],
      tmpii = 0
    d.forEach((x, i) => {
      if (x > tmpmax) {
        tmpmax = x
        tmpii = i
      }
    })
    return [tmpii, tmpmax]
  }
  // determine the position where a particular kmer matches the reference sequence
  function seedMatch(kmer) {
    let tmpScore = 0
    let maxScore = 0
    let maxShift = -1
    for (let shift = 0; shift < ref.length - kmer.length; shift++) {
      tmpScore = 0
      for (let pos = 0; pos < kmer.length; pos++) {
        if (kmer[pos] == ref[shift + pos]) {
          tmpScore++
        }
      }
      if (tmpScore > maxScore) {
        maxScore = tmpScore
        maxShift = shift
      }
    }
    return [maxShift, maxScore]
  }

  // console.log(query);
  // console.log(ref);
  // perform a number of seed matches to determine te rough alignment of query rel to ref
  const nSeeds = 5,
    seedLength = 21
  let bandWidth = d3.min([ref.length, query.length])
  let meanShift = 0

  if (bandWidth > 2 * seedLength) {
    const seedMatches = []
    let tmpShift, tmpScore, qPos
    for (let ni = 0; ni < nSeeds; ni++) {
      // generate kmers equally spaced on the query
      qPos = Math.round((query.length - seedLength) / (nSeeds - 1)) * ni
      ;[tmpShift, tmpScore] = seedMatch(query.substring(qPos, qPos + seedLength))

      // only use seeds that match at least 70%
      if (tmpScore >= 0.7 * seedLength) {
        seedMatches.push([qPos, tmpShift, tmpShift - qPos, tmpScore])
      }
    }
    // given the seed matches, determine the maximal and minimal shifts
    // this shift is the typical amount the query needs shifting to match ref
    // ref:   ACTCTACTGC-TCAGAC
    // query: ----TCACTCATCT-ACACCGAT  => shift = 4, then 3, 4 again
    const minShift = d3.min(
      seedMatches.map(function (d) {
        return d[2]
      }),
    )
    const maxShift = d3.max(
      seedMatches.map(function (d) {
        return d[2]
      }),
    )
    bandWidth = maxShift - minShift + 9
    meanShift = Math.round(0.5 * (minShift + maxShift))
  }

  function indexToShift(si) {
    return si - bandWidth + meanShift
  }
  // allocate a matrix to record the matches
  const rowLength = ref.length + 1
  const scores = [],
    paths = []
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
  const gapExtend = 0,
    gapOpen = -2,
    misMatch = -1,
    match = 3
  const END_OF_SEQUENCE = -1
  let si, ri, shift, tmpMatch, cmp, qPos, origin, score, qGapOpen, rGapOpen
  for (ri = 0; ri < ref.length; ri++) {
    for (si = 2 * bandWidth; si >= 0; si--) {
      shift = indexToShift(si)
      qPos = ri - shift
      // if the shifted position is within the query sequence
      if (qPos >= 0 && qPos < query.length) {
        tmpMatch = ref[ri] === query[qPos] || query[qPos] === 'N' ? match : misMatch
        rGapOpen = si < 2 * bandWidth ? (paths[si + 1][ri + 1] === 2 ? 0 : gapOpen) : 0
        qGapOpen = si > 0 ? (paths[si - 1][ri] === 3 ? 0 : gapOpen) : 0
        cmp = [
          0, // unaligned
          scores[si][ri] + tmpMatch, // match -- shift stays the same
          si < 2 * bandWidth ? scores[si + 1][ri + 1] + gapExtend + rGapOpen : gapExtend, // putting a gap into ref
          si > 0 ? scores[si - 1][ri] + gapExtend + qGapOpen : gapExtend, // putting a gap into query
        ]
        ;[origin, score] = argmax(cmp)
      } else if (qPos < 0) {
        score = 0
        origin = 3
      } else {
        score = END_OF_SEQUENCE
        origin = END_OF_SEQUENCE
      }
      paths[si][ri + 1] = origin
      scores[si][ri + 1] = score
    }
  }
  if (debug) {
    if (scores.length < 20) {
      console.log('MM')
      scores.forEach((d, i) => console.log(i, d.join('\t')))
      console.log('D')
      paths.forEach((d, i) => console.log(i, d.join('\t')))
    } else {
      console.log('MM', scores)
    }
  }

  // Determine the best alignment by picking the optimal score at the end of the query
  const aln = []
  const lastIndexByShift = scores.map((d, i) => d3.min([rowLength - 1, query.length + indexToShift(i)]))
  const lastScoreByShift = scores.map((d, i) => d[lastIndexByShift[i]])

  si = argmax(lastScoreByShift)[0]
  shift = indexToShift(si)
  const bestScore = lastScoreByShift[si]

  // determine position tuple qPos, rPos corresponding to the place it the matrix
  let rPos = lastIndexByShift[si] - 1
  qPos = rPos - shift
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
  let tmpmax = 0
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

  //reverse and make sequence
  aln.reverse()
  if (debug) {
    console.log(aln)
  }
  return {
    query: aln.map((d) => d[0]),
    ref: aln.map((d) => d[1]),
    score: bestScore,
  }
}
