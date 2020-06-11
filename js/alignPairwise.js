function alignPairwise(query, ref){
    const debug=false
    // determine the position where a particular kmer matches the reference sequence
    function seedMatch(kmer){
        let tmpScore = 0;
        let maxScore = 0;
        let maxShift = -1;
        for(let shift=0; shift<ref.length-kmer.length;shift++){
            tmpScore=0;
            for (let pos=0; pos<kmer.length; pos++){
                if (kmer[pos]==ref[shift+pos]){
                    tmpScore++;
                }
            }
            if (tmpScore>maxScore){
                maxScore=tmpScore;
                maxShift=shift;
            }
        }
        return [maxShift, maxScore];
    }

    // console.log(query);
    // console.log(ref);
    // perform a number of seed matches to determine te rough alignment of query rel to ref
    const nSeeds = 5, seedLength = 21;
    let bandWidth = d3.min([ref.length, query.length]);
    let meanShift = 0;

    if (bandWidth>2*seedLength) {
        const seedMatches = [];
        let tmpShift, tmpScore, qPos;
        for (let ni=0; ni<nSeeds; ni++){
            // generate kmers equally spaced on the query
            qPos = Math.round(query.length/nSeeds)*ni;
            [tmpShift, tmpScore] = seedMatch(query.substring(qPos, qPos+seedLength));

            // only use seeds that match at least 70%
            if (tmpScore>=0.7*seedLength){
                seedMatches.push([qPos, tmpShift, tmpShift - qPos, tmpScore]);
            }
        }
        // given the seed matches, determine the maximal and minimal shifts
        // this shift is the typical amount the query needs shifting to match ref
        // ref:   ACTCTACTGC-TCAGAC
        // query: ----TCACTCATCT-ACACCGAT  => shift = 4, then 3, 4 again
        const minShift = d3.min(seedMatches.map(function (d){return d[2];}))
        const maxShift = d3.max(seedMatches.map(function (d){return d[2];}))
        bandWidth = 3*(maxShift-minShift) + 9;
        meanShift = Math.round(0.5*(minShift+maxShift));
    }

    function indexToShift(si){
        return si - bandWidth + meanShift;
    }
    console.log("BW", bandWidth)
    // allocate a matrix to record the matches
    const rowLength = ref.length + 1;
    const matchMatrix = []
    for (shift=-bandWidth; shift<bandWidth+1; shift++){
        matchMatrix.push(new Int16Array(rowLength));
    }


    // fill matchMatrix with alignment scores
    // The inner index matchMatrix[][ri] is the index of the reference sequence
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
    const gapExtend = -1, misMatch = -2, match=1;
    const END_OF_SEQUENCE = -30;
    let si, ri, shift, tmpMatch, cmp;
    for (ri=0; ri<ref.length; ri++){
        for (si=2*bandWidth; si>=0; si--){
            shift = indexToShift(si);
            qPos = ri - shift;
            // if the shifted position is within the query sequence
            if (qPos>=0 && qPos<query.length){
                tmpMatch = ref[ri]===query[qPos] ? match : misMatch;
                cmp = [
                  matchMatrix[si][ri] + tmpMatch, // match -- shift stays the same
                  si < 2 * bandWidth
                    ? matchMatrix[si + 1][ri + 1] + gapExtend
                    : gapExtend, // putting a gap into ref
                  si > 0 ? matchMatrix[si - 1][ri] + gapExtend : gapExtend,
                ]; // putting a gap into query
                matchMatrix[si][ri + 1] = d3.max(cmp);
            } else if (qPos<0) {
                matchMatrix[si][ri + 1] = 0;
            } else {
                matchMatrix[si][ri + 1] = END_OF_SEQUENCE;
            }
        }
    }
    if (debug){
        if (matchMatrix.length<10){
            console.log("MM")
            matchMatrix.forEach((d,i) => console.log(i, d.join('\t')))
        }else{
            console.log('MM', matchMatrix)
        }
    }
    // self made argmax function
    function argmax(d){
        let tmpmax=d[0], tmpii=0;
        d.forEach(function (x,ii){if (x>=tmpmax){tmpmax=x; tmpii=ii;}})
        return [tmpii, tmpmax];
    }
    // Back trace
    const lastIndexByShift = matchMatrix.map((d, i) => query.length + indexToShift(i));
    const lastScoreByShift = matchMatrix.map((d, i) => d[lastIndexByShift[i]]);
    si = argmax(lastScoreByShift)[0];
    shift = indexToShift(si);
    let rPos = lastIndexByShift[si] - 1;
    let qPos = rPos - shift;
    const aln = [];
    // add right overhang
    if (rPos<ref.length-1){
        for (let ii=ref.length-1; ii>rPos; ii--){
            aln.push(['-', ref[ii]]);
        }
    }else if (qPos<query.length-1){
        for (let ii=query.length-1; ii>qPos; ii--){
            aln.push([query[ii], '-']);
        }
    }

    // do backtrace for aligned region
    let tmpmax=0;
    while (rPos>0 && qPos>0){
        // console.log(rPos, qPos, si)
        cmp = [
          matchMatrix[si][rPos],
          si < 2 * bandWidth ? matchMatrix[si + 1][rPos + 1] : END_OF_SEQUENCE,
          si > 0 ? matchMatrix[si - 1][rPos] : END_OF_SEQUENCE,
        ];
        tmpmax=d3.max(cmp);
        if (tmpmax==cmp[0]){
            aln.push([query[qPos], ref[rPos]]);
            qPos--;
            rPos--;
        }else if (tmpmax==cmp[1]){
            aln.push([query[qPos], "-"]);
            qPos--;
            si++;
        }else if (tmpmax==cmp[2]){
            aln.push(["-", ref[rPos]]);
            rPos--;
            si--;
        }
    }
    aln.push([query[qPos], ref[rPos]]);

    // add left overhang
    if (rPos>0){
        for (let ii=rPos-1; ii>=0; ii--){
            aln.push(["-", ref[ii]]);
        }
    }else if (qPos>0){
        for (let ii=qPos-1; qPos>=0; ii--){
            aln.push([query[ii], "-"]);
        }
    }

    //reverse and make sequence
    aln.reverse();
    return [aln.map(function (d){return d[0];}), aln.map(function (d){return d[1];})];
}

