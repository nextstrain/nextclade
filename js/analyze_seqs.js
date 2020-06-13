
clades = {
"19A": [{pos:8782, allele:"C"},
        {pos:14408, allele:"C"}],
"19B": [{pos:8782,	allele:"T"},
        {pos:28144,	allele:"C"}],
"20A": [{pos:8782,	allele:"C"},
        {pos:14408,	allele:"T"},
        {pos:23403,	allele:"G"}],
"20B": [{pos:8782,	allele:"C"},
        {pos:14408,	allele:"T"},
        {pos:23403,	allele:"G"},
        {pos:28881,	allele:"A"},
        {pos:28882,	allele:"A"}],
"20C": [{pos:1059,	allele:"T"},
        {pos:8782,	allele:"C"},
        {pos:14408,	allele:"T"},
        {pos:23403,	allele:"G"},
        {pos:25563,	allele:"T"}]
}

function addSequence(current_seq, current_seq_name, seqs, all_names) {
  if (current_seq_name == "") {
    current_seq_name = "input sequence";
  }
  let name_count = 0;
  for (let tmpii = 0; tmpii < all_names; tmpii++) {
    if (all_names[ii] == current_seq_name) {
      name_count++;
    }
  }
  if (name_count) {
    suffix = " " + (name_count + 1);
  } else {
    suffix = "";
  }
  all_names.push(current_seq_name);
  seqs[current_seq_name + suffix] = current_seq;
}


function parseSequences(lines){
  const seqs = {};
  let current_seq_name = "";
  let current_seq = "";
  const seq_names = [];
  for (let li=0; li<lines.length; li++){
      if (lines[li][0]=='>'){
          if (current_seq.length){
              addSequence(current_seq, current_seq_name, seqs, seq_names);
          }
          current_seq_name = lines[li].substring(1,lines[li].length);
          current_seq = "";
      }else{
          current_seq += lines[li].toUpperCase();
      }
  }
  if (current_seq.length){
      addSequence(current_seq, current_seq_name, seqs, seq_names);
  }
  return seqs;
}

function isNodeInClade(cladeAlleles, mutations, reference) {
    const conditions = cladeAlleles.map((d) => {
        const state = mutations[d.pos]===undefined ? reference[d.pos-1] : mutations[d.pos];
        return state===d.allele
    })
    return conditions.every((d) => d)
}

function analyzeSeq(seq) {
  const {query, ref, score} = alignPairwise(seq, rootSeq)
  console.log("Alignment score:", score);

  // report insertions
  let refPos = 0
  let ins = ''
  let insStart = -1
  ref.forEach((d,i) => {
    if (d === "-") {
      if (ins === "") {
        insStart = refPos;
      }
      ins += query[i];
    } else {
      if (ins) {
        console.log(`insertion at position ${insStart}: ${ins}`);
        ins = "";
      }
      refPos += 1;
    }
  })
  // strip insertions relative to reference
  const refStripped = query.filter( (d, i) => ref[i]!=='-' )

  // report mutations
  let lastChar = -1
  let nDel = 0
  let delPos = -1
  let beforeAlignment = true
  const mutations = {}
  refStripped.forEach((d,i) => {
    if (d!=='-') {
      if (beforeAlignment){
        console.log(`Alignment start: ${i+1}`);
        beforeAlignment = false;
      } else if (nDel) {
        console.log(`Deletion of length ${nDel} at ${delPos + 1}`);
        nDel = 0
      }
      lastChar = i
    }
    if (d!=='-' && d!==rootSeq[i] && d!='N') {
      console.log(`Mutation at position ${i+1}: ${rootSeq[i]} --> ${d}`)
      mutations[i + 1] = d
    } else if (d==='-' && !beforeAlignment) {
      if (!nDel) {delPos = i;}
      nDel ++
    }
  })
  console.log(`Alignment end: ${lastChar+1}`);
  const assignedClades = Object.keys(clades).filter((clade) => isNodeInClade(clades[clade], mutations, rootSeq))
  console.log("CLADES",assignedClades)
}


d3.select("#seqinput").on("keyup", function () {
  const lines = document.getElementById("seqinput").value.split("\n");
  seqs = parseSequences(lines)
  Object.keys(seqs).forEach(element => {
    console.log("processing ", element)
    analyzeSeq(seqs[element]);
  });
});
