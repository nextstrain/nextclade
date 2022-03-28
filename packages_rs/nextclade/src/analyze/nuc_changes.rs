use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NucSub {
  #[serde(rename = "ref")]
  pub reff: Nuc,
  pub pos: usize,
  pub qry: Nuc,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NucDel {
  pub start: usize,
  pub length: usize,
}

pub struct FindNucChangesOutput {
  pub substitutions: Vec<NucSub>,
  pub deletions: Vec<NucDel>,
  pub alignment_start: i64,
  pub alignment_end: i64,
}

/// Finds nucleotide changes (nucleotide substitutions and deletions) as well
/// as the beginning and end of the alignment range.
///
/// @pre Precondition: sequences are expected to be aligned and stripped from insertions.
pub fn find_nuc_changes(qry_aln: &[Nuc], ref_aln: &[Nuc]) -> FindNucChangesOutput {
  assert_eq!(ref_aln.len(), qry_aln.len());

  let mut n_del: i64 = 0;
  let mut del_pos: i64 = -1;
  let mut before_alignment = true;

  let mut substitutions = Vec::<NucSub>::new();
  let mut deletions = Vec::<NucDel>::new();
  let mut alignment_start: i64 = -1;
  let mut alignment_end: i64 = -1;

  for i in 0..qry_aln.len() {
    let d = qry_aln[i];

    if !d.is_gap() {
      if before_alignment {
        alignment_start = i as i64;
        before_alignment = false;
      } else if n_del > 0 {
        deletions.push(NucDel {
          start: del_pos as usize,
          length: n_del as usize,
        });
        n_del = 0;
      }
      alignment_end = (i + 1) as i64;
    }

    let ref_nuc = ref_aln[i];
    if !d.is_gap() && (d != ref_nuc) && d.is_acgt() {
      substitutions.push(NucSub {
        reff: ref_nuc,
        pos: i,
        qry: d,
      });
    } else if d.is_gap() && !before_alignment {
      if n_del == 0 {
        del_pos = i as i64;
      }
      n_del += 1;
    }
  }

  FindNucChangesOutput {
    substitutions,
    deletions,
    alignment_start,
    alignment_end,
  }
}
