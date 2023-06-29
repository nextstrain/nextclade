use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::range::NucRefGlobalRange;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;

pub struct FindNucChangesOutput {
  pub substitutions: Vec<NucSub>,
  pub deletions: Vec<NucDelRange>,
  pub alignment_range: NucRefGlobalRange,
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
  let mut deletions = Vec::<NucDelRange>::new();
  let mut alignment_start: i64 = -1;
  let mut alignment_end: i64 = -1;

  for i in 0..qry_aln.len() {
    let d = qry_aln[i];

    if !d.is_gap() {
      if before_alignment {
        alignment_start = i as i64;
        before_alignment = false;
      } else if n_del > 0 {
        deletions.push(NucDelRange::from_usize(del_pos as usize, (del_pos + n_del) as usize));
        n_del = 0;
      }
      alignment_end = (i + 1) as i64;
    }

    let ref_nuc = ref_aln[i];
    if !d.is_gap() && (d != ref_nuc) && d.is_acgt() {
      substitutions.push(NucSub {
        ref_nuc,
        pos: i.into(),
        qry_nuc: d,
      });
    } else if d.is_gap() && !before_alignment {
      if n_del == 0 {
        del_pos = i as i64;
      }
      n_del += 1;
    }
  }

  substitutions.sort();
  deletions.sort();

  FindNucChangesOutput {
    substitutions,
    deletions,
    alignment_range: NucRefGlobalRange::from_usize(alignment_start as usize, alignment_end as usize),
  }
}
