use crate::alphabet::nuc::Nuc;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::PositionLike;
use serde::{Deserialize, Serialize};

/// Nucleotide substitution with local reference nucleotide context centered on the substituted position.
///
/// Current output contains `[upstream, current, downstream]`. `current` is the substituted reference nucleotide.
/// Boundary positions use gap characters for absent flanking nucleotides.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Hash)]
#[serde(rename_all = "camelCase")]
pub struct NucSubWithContext {
  /// Nucleotide substitution.
  #[serde(flatten)]
  pub sub: NucSub,

  /// Reference nucleotide context around the substituted position.
  pub ref_context: Vec<Nuc>,
}

impl NucSubWithContext {
  pub fn from_sub(sub: &NucSub, ref_seq: &[Nuc]) -> Self {
    let pos = sub.pos.as_usize();
    let upstream = if pos > 0 { ref_seq[pos - 1] } else { Nuc::Gap };
    let current = ref_seq[pos];
    let downstream = if pos + 1 < ref_seq.len() {
      ref_seq[pos + 1]
    } else {
      Nuc::Gap
    };
    Self {
      sub: sub.clone(),
      ref_context: vec![upstream, current, downstream],
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::to_nuc_seq;
  use crate::coord::position::NucRefGlobalPosition;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  fn make_sub(pos: usize, ref_nuc: Nuc, qry_nuc: Nuc) -> NucSub {
    NucSub {
      pos: NucRefGlobalPosition::from(pos),
      ref_nuc,
      qry_nuc,
    }
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::interior(   5, "ACGTACGT", "ACG")]
  #[case::first_pos(  0, "TAC",      "-TA")]
  #[case::last_pos(   2, "ACG",      "CG-")]
  #[case::single_base(0, "T",        "-T-")]
  #[trace]
  fn test_nuc_sub_context_from_sub(
    #[case] pos: usize,
    #[case] ref_seq: &str,
    #[case] expected_context: &str,
  ) -> Result<(), Report> {
    let ref_seq = to_nuc_seq(ref_seq)?;
    let expected_context = to_nuc_seq(expected_context)?;
    let sub = make_sub(pos, ref_seq[pos], Nuc::A);
    let result = NucSubWithContext::from_sub(&sub, &ref_seq);
    assert_eq!(expected_context, result.ref_context);
    assert_eq!(ref_seq[pos], result.ref_context[1]);
    Ok(())
  }
}
