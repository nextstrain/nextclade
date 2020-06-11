
function addSequence(current_seq, current_seq_name, seqs, all_names) {
  if (current_seq_name == "") {
    current_seq_name = "input sequence";
  }
  var name_count = 0;
  for (var tmpii = 0; tmpii < all_names; tmpii++) {
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
  var seqs = {};
  var unmatched = [];
  var closest_nodes = {};
  var current_seq_name = "";
  var current_seq = "";
  var seq_names = [];
  var suffix;
  for (var li=0; li<lines.length; li++){
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


function analyzeSeq(seq) {
  const [query, ref] = alignPairwise(seq, rootSeq)
  // report insertions
  let refPos = 0
  ref.forEach((d,i) => {
    if (d==='-'){
      console.log(`insertion at position ${refPos+1}: ${query[i]}`)
    } else {
      refPos += 1
    }
  })

  // strip insertions relative to reference
  const refStripped = query.filter( (d, i) => ref[i]!=='-' )

  // report mutations
  let lastChar = -1
  let beforeAlignment = true
  refStripped.forEach((d,i) => {
    if (d!=='-') {
      if (beforeAlignment){
        console.log(`Alignment start: ${i+1}`);
        beforeAlignment = false;
      }
      lastChar = i
    }
    if (d!=='-' && d!==rootSeq[i] && d!='N') {
      console.log(`Mutation at position ${i+1}: ${rootSeq[i]} --> ${d}`)
    }
  })
  console.log(`Alignment end: ${lastChar+1}`);
}


d3.select("#seqinput").on("keyup", function () {
  var lines = document.getElementById("seqinput").value.split("\n");
  seqs = parseSequences(lines)
  Object.keys(seqs).forEach(element => {
    console.log("processing ", element)
    analyzeSeq(seqs[element]);
  });
});
