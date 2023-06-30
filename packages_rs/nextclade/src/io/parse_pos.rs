use crate::utils::error::to_eyre_error;
use eyre::{Report, WrapErr};

/// Parses position from string.
///
/// Note that Nextclade uses 0-based indices, including for positions in sequences. However, in bioinformatics it is
/// more common to see 1-based indexing. We perform the conversion here.
pub fn parse_pos(s: &str) -> Result<isize, Report> {
  let pos = to_eyre_error(s.parse::<usize>()).wrap_err_with(|| format!("Unable to parse position: '{s}'"))?;
  Ok((pos - 1) as isize)
}
