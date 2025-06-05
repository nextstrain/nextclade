use crate::alphabet::nuc::Nuc;
use crate::analyze::letter_ranges::{find_letter_ranges, NucRange};
use crate::make_error;
use color_eyre::{Section, SectionExt};
use eyre::{Report, WrapErr};
use itertools::Itertools;

pub fn validate_ref_seq(seq_name: &str, seq: &[Nuc]) -> Result<(), Report> {
  validate_ref_seq_impl(seq)
    .wrap_err_with(|| format!("When validating reference sequence '{seq_name}'"))
    .with_section(|| REF_SEQ_ERROR.header("Context:"))
}

fn validate_ref_seq_impl(seq: &[Nuc]) -> Result<(), Report> {
  seq_check_empty(seq)?;
  seq_check_gaps(seq)?;
  Ok(())
}

fn seq_check_empty(seq: &[Nuc]) -> Result<(), Report> {
  if seq.is_empty() {
    return make_error!("Sequence is empty");
  }
  Ok(())
}

fn seq_check_gaps(seq: &[Nuc]) -> Result<(), Report> {
  let ref_gap_ranges: Vec<NucRange> = find_letter_ranges(seq, Nuc::Gap);
  if !ref_gap_ranges.is_empty() {
    let ranges_formatted = ref_gap_ranges.into_iter().map(|r| r.range.to_string()).join(",");
    return make_error!("Reference sequence contains gaps in the following positions: {ranges_formatted}. Gaps are not allowed; the reference sequence is expected to be high-quality, complete, and unambiguous.");
  }
  Ok(())
}

const REF_SEQ_ERROR: &str = r#"Nextclade detected that reference sequence provided is invalid and is unable to proceed. This could be due to one of the reasons:

1. Nextclade dataset author included a reference sequence that is invalid (or it became invalid due to new requirements, as Nextclade evolves).

   Possible solution: contact dataset author so that they could fix the problem and update the dataset. If it's an official Nextclade dataset, then submit an issue at https://github.com/nextstrain/nextclade_data/issues


2. A custom reference sequence is provided using `--input-ref` CLI argument or `&input-ref` URL parameter, and the sequence is invalid.

   Possible solution: provide a valid reference sequence or remove the customization if possible.


3. You navigated to Nextclade from the "View in other platforms" section of nextstrain.org or from Auspice app.

   Possible solution: This feature is highly experimental and requires certain additional information to be present in the Nextstrain/Auspice trees (genome annotation, reference sequence). Not all trees have been updated for that. Therefore, unfortunately, not all Nextstrain/Auspice trees currently can also be used as full Nextclade datasets. If you are interested in making a particular Nextstrain/Auspice tree to work in Nextclade, please contact maintainers of that particular tree (usually noted at the top of the page or, sometimes, in the credits at the bottom).


4. You navigated to Nextclade from another app or a third-party integration.

   Possible solution: contact app or integration maintainers for help.


5. It could be that you are using an old version of Nextclade which contains a bug, and it is possible that the bug has been fixed in the newer version.

   Possible solution: if you are using Nextclade Web, please reload the browser page bypassing the cache (Ctrl+F5 or Cmd+F5). If you are using Nextclade CLI, then install a new version the same way you installed the old one. If you are not sure, check the installation instructions in the documentation.


For more information, see:
- Nextclade user documentation: https://docs.nextstrain.org/projects/nextclade/en/stable/index.html
- Nextclade dataset author documentation: https://github.com/nextstrain/nextclade_data/tree/master/docs
"#;
