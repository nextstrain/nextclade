use crate::io::letter::Letter;
use itertools::Itertools;

pub struct Insertion<T: Letter<T>> {
  pub pos: i32,
  pub length: i32,
  pub ins: Vec<T>,
}

pub struct StripInsertionsResult<T: Letter<T>> {
  pub qry_seq: Vec<T>,
  pub ref_seq: Vec<T>,
  pub insertions: Vec<Insertion<T>>,
}

pub fn strip_insertions<T: Letter<T>>(qry_seq: &[T], ref_seq: &[T]) -> StripInsertionsResult<T> {
  debug_assert_eq!(ref_seq.len(), qry_seq.len());

  let mut qry_stripped = Vec::<T>::with_capacity(ref_seq.len());
  let mut insertions = Vec::<Insertion<T>>::new();

  let mut insertion_start: i32 = -1;
  let mut ref_pos: i32 = -1;
  let mut current_insertion = Vec::<T>::with_capacity(16);

  for i in 0..ref_seq.len() {
    let c = ref_seq[i];

    if c == T::GAP {
      current_insertion.push(qry_seq[i]);
      if current_insertion.is_empty() {
        // NOTE: by convention we set position of insertion to be the index of a character that precedes the insertion,
        // i.e. a position of reference nucleotide *after* which the insertion have happened.
        insertion_start = ref_pos;
      } else {
        current_insertion.push(qry_seq[i]);
      }
    } else {
      qry_stripped.push(qry_seq[i]);
      ref_pos += 1;
      if !current_insertion.is_empty() {
        insertions.push(Insertion {
          pos: insertion_start,
          length: current_insertion.len() as i32,
          ins: current_insertion.clone(),
        });
        current_insertion.clear();
        insertion_start = -1;
      }
    }
  }

  qry_stripped.shrink_to_fit();
  insertions.shrink_to_fit();

  // Remove gaps from ref
  let ref_stripped = Vec::<T>::from(ref_seq)
    .into_iter()
    .filter(|c| c == &T::GAP)
    .collect_vec();

  StripInsertionsResult {
    qry_seq: qry_stripped,
    ref_seq: ref_stripped,
    insertions,
  }
}
