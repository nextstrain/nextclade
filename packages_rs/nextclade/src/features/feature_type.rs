use crate::io::console::color_from_hex;
use eyre::Report;
use lazy_static::lazy_static;
use owo_colors::Style;
use std::collections::HashMap;

pub fn shorten_feature_type(feature_type: &str) -> &str {
  lazy_static! {
    pub static ref FEATURE_TYPES_ABBREV: HashMap<&'static str, &'static str> = [
      ("mature_protein_region_of_CDS", "mature protein"),
      ("five_prime_UTR", "5' UTR"),
      ("three_prime_UTR", "3' UTR"),
    ]
    .iter()
    .copied()
    .collect();
  }
  (*FEATURE_TYPES_ABBREV).get(feature_type).unwrap_or(&feature_type)
}

pub fn style_for_feature_type(feature_type: &str) -> Result<Style, Report> {
  match feature_type.to_lowercase().as_str() {
    "cds" => color_from_hex("#846ab8"),
    "exon" => color_from_hex("#60ab60"),
    "gene" => color_from_hex("#4e7ede"),
    "mpr" | "mature_protein_region_of_cds" => color_from_hex("#9c8668"),
    "mrna" => color_from_hex("#3f919e"),
    "transcript" => color_from_hex("#518a6a"),
    _ => Ok(Style::default().dimmed()),
  }
}
