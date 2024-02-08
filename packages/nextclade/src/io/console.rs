use eyre::{eyre, Report};
use owo_colors::{DynColors, ParseColorError, Style};
use std::str::FromStr;

pub fn color_from_hex(hex_color: &str) -> Result<Style, Report> {
  let color = DynColors::from_str(hex_color).map_err(|err: ParseColorError| eyre!("{err:#?}"))?;
  Ok(Style::default().color(color))
}
