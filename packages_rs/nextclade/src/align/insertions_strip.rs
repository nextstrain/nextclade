use crate::io::aa::Aa;
use crate::io::letter::{serde_deserialize_seq, serde_serialize_seq, Letter};
use crate::io::nuc::Nuc;
use crate::translate::translate_genes::Translation;
use color_eyre::SectionExt;
use eyre::Report;
use itertools::Itertools;
use serde::de::Error;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::cmp::Ordering;
use std::str::FromStr;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Insertion<T: Letter<T>> {
  pub pos: i32,

  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
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

/// Order nuc insertions by position, then length
impl<T: Letter<T>> Ord for Insertion<T> {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.ins.len()).cmp(&(other.pos, other.ins.len()))
  }
}

impl<T: Letter<T>> PartialOrd for Insertion<T> {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

  if !current_insertion.is_empty() {
    insertions.push(Insertion {
      pos: insertion_start,
      ins: current_insertion.clone(),
    });
  }

  qry_stripped.shrink_to_fit();
  insertions.shrink_to_fit();
  insertions.sort();

  // Remove gaps from ref
  let mut ref_stripped = ref_seq.to_vec();
  ref_stripped.retain(|c| c != &T::GAP);

  StripInsertionsResult {
    qry_seq: qry_stripped,
    ref_seq: ref_stripped,
    insertions,
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaIns {
  pub gene: String,
  pub pos: i32,

  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub ins: Vec<Aa>,
}

/// Order amino acid insertions by gene, position, then length
impl Ord for AaIns {
  fn cmp(&self, other: &Self) -> Ordering {
    (&self.gene, self.pos, self.ins.len()).cmp(&(&other.gene, other.pos, other.ins.len()))
  }
}

impl PartialOrd for AaIns {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

pub fn get_aa_insertions(translation: &Translation) -> Vec<AaIns> {
  translation
    .iter_cdses()
    .flat_map(|cds_tr| {
      cds_tr.insertions.iter().map(|Insertion::<Aa> { pos, ins }| AaIns {
        gene: cds_tr.cds.name.clone(),
        pos: *pos,
        ins: ins.clone(),
      })
    })
    .sorted()
    .collect_vec()
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::io::nuc::to_nuc_seq;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  fn finds_terminal_insertions() -> Result<(), Report> {
    let qry_seq = to_nuc_seq("ACCACGCTCGCATCATC")?;
    let ref_seq = to_nuc_seq("---ACGCTCGCAT----")?;
    //                           0123456789

    #[rustfmt::skip]
    let expected_insertions = vec![
      Insertion::<Nuc> { pos: -1, ins: to_nuc_seq("ACC")? },
      Insertion::<Nuc> { pos: 9, ins: to_nuc_seq("CATC")? }
    ];

    #[rustfmt::skip]
    let StripInsertionsResult { insertions, ref_seq, qry_seq } = insertions_strip(&qry_seq, &ref_seq);

    assert_eq!(insertions, expected_insertions);
    assert_eq!(qry_seq, ref_seq);
    Ok(())
  }
}
