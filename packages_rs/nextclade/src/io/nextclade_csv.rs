use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::pcr_primer_changes::PcrPrimerChange;
use crate::io::nuc::from_nuc;
use crate::utils::range::Range;
use itertools::Itertools;
use map_in_place::MapVecInPlace;

pub fn format_range(range: &Range) -> String {
  debug_assert!(range.begin <= range.end);

  if range.begin >= range.end {
    return "empty range".to_owned();
  }

  // NOTE: we (and C++ standard library) uses 0-based half-open ranges,
  // but bioinformaticians prefer 1-based, closed ranges
  let begin_one = range.begin + 1;
  let end_one = range.end;
  if end_one == begin_one {
    format!("{begin_one}")
  } else {
    format!("{begin_one}-{end_one}")
  }
}

pub fn format_nuc_substitutions(substitutions: &[NucSub], delimiter: &str) -> String {
  substitutions.iter().map(NucSub::to_string).join(delimiter)
}

pub fn format_deletions(deletions: &[NucDel], delimiter: &str) -> String {
  deletions
    .iter()
    .map(|del| format_range(&del.to_range()))
    .join(delimiter)
}

pub fn format_non_acgtns(non_acgtns: &[NucRange], delimiter: &str) -> String {
  non_acgtns
    .iter()
    .map(|non_acgtn| {
      let nuc = from_nuc(non_acgtn.letter);
      let range = format_range(&non_acgtn.to_range());
      format!("{nuc}:{range}")
    })
    .join(delimiter)
}

pub fn format_missings(missings: &[NucRange], delimiter: &str) -> String {
  missings
    .iter()
    .map(|missing| format_range(&missing.to_range()))
    .join(delimiter)
}

pub fn format_pcr_primer_changes(pcr_primer_changes: &[PcrPrimerChange], delimiter: &str) -> String {
  pcr_primer_changes
    .iter()
    .map(|pc| {
      let name = &pc.primer.name;
      let subs = format_nuc_substitutions(&pc.substitutions, ";");
      format!("{name}:{subs}")
    })
    .join(delimiter)
}

pub fn format_failed_genes(failed_genes: &[String], delimiter: &str) -> String {
  failed_genes.join(delimiter)
}
