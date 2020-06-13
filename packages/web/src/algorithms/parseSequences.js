export function addSequence(current_seq, current_seq_name, seqs, all_names) {
  if (current_seq_name == '') {
    current_seq_name = 'input sequence'
  }
  let name_count = 0
  for (let tmpii = 0; tmpii < all_names; tmpii++) {
    if (all_names[ii] == current_seq_name) {
      name_count++
    }
  }

  let suffix = ''
  if (name_count) {
    suffix = ' ' + (name_count + 1)
  }

  all_names.push(current_seq_name)
  seqs[current_seq_name + suffix] = current_seq
}

export function parseSequences(lines) {
  const seqs = {}
  let current_seq_name = ''
  let current_seq = ''
  const seq_names = []
  for (let li = 0; li < lines.length; li++) {
    if (lines[li][0] == '>') {
      if (current_seq.length) {
        addSequence(current_seq, current_seq_name, seqs, seq_names)
      }
      current_seq_name = lines[li].substring(1, lines[li].length)
      current_seq = ''
    } else {
      current_seq += lines[li].toUpperCase()
    }
  }
  if (current_seq.length) {
    addSequence(current_seq, current_seq_name, seqs, seq_names)
  }
  return seqs
}
