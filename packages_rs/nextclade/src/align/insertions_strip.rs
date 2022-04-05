use crate::io::aa::Aa;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::translate::translate_genes::Translation;
use crate::utils::error::keep_ok;
use eyre::Report;
use itertools::Itertools;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Insertion<T: Letter<T>> {
  pub pos: i32,
  pub ins: Vec<T>,
}

impl<T: Letter<T>> Insertion<T> {
  pub fn len(&self) -> usize {
    self.ins.len()
  }

  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }
}

pub type NucIns = Insertion<Nuc>;

pub struct StripInsertionsResult<T: Letter<T>> {
  pub qry_seq: Vec<T>,
  pub ref_seq: Vec<T>,
  pub insertions: Vec<Insertion<T>>,
}

pub fn insertions_strip<T: Letter<T>>(qry_seq: &[T], ref_seq: &[T]) -> StripInsertionsResult<T> {
  debug_assert_eq!(ref_seq.len(), qry_seq.len());

  let mut qry_stripped = Vec::<T>::with_capacity(ref_seq.len());
  let mut insertions = Vec::<Insertion<T>>::new();

  let mut insertion_start: i32 = -1;
  let mut ref_pos: i32 = -1;
  let mut current_insertion = Vec::<T>::with_capacity(16);

  for i in 0..ref_seq.len() {
    let c = ref_seq[i];

    if c.is_gap() {
      if current_insertion.is_empty() {
        // NOTE: by convention we set position of insertion to be the index of a character that precedes the insertion,
        // i.e. a position of reference nucleotide *after* which the insertion have happened.
        insertion_start = ref_pos;
      }
      current_insertion.push(qry_seq[i]);
    } else {
      qry_stripped.push(qry_seq[i]);
      ref_pos += 1;
      if !current_insertion.is_empty() {
        insertions.push(Insertion {
          pos: insertion_start,
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
  let mut ref_stripped = ref_seq.to_vec();
  ref_stripped.retain(|c| c != &T::GAP);

  StripInsertionsResult {
    qry_seq: qry_stripped,
    ref_seq: ref_stripped,
    insertions,
  }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaIns {
  pub gene_name: String,
  pub pos: i32,
  pub ins: Vec<Aa>,
}

pub fn get_aa_insertions(translations: &[Result<Translation, Report>]) -> Vec<AaIns> {
  keep_ok(translations)
    .flat_map(|tr| {
      tr.insertions.iter().cloned().map(|Insertion::<Aa> { pos, ins }| AaIns {
        gene_name: tr.gene_name.clone(),
        pos,
        ins,
      })
    })
    .collect_vec()
}
