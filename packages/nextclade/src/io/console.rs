use crate::make_error;
use clap::ValueEnum;
use console::{Color, Style};
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Default, Debug, Serialize, Deserialize, ValueEnum)]
#[serde(rename_all = "kebab-case")]
pub enum CliColorMode {
  /// Automatically enable colors if output is a TTY (default)
  #[default]
  Auto,

  /// Always enable colors
  Always,

  /// Never enable colors
  Never,
}

impl CliColorMode {
  pub fn resolve(cli_color: Option<Self>, cli_no_color: bool) -> Self {
    if let Some(cli_color) = cli_color {
      return cli_color;
    }

    if cli_no_color {
      return Self::Never;
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
      if std::env::var("CLICOLOR_FORCE").ok().as_deref() == Some("1") {
        return Self::Always;
      }
      if std::env::var_os("NO_COLOR").is_some() {
        return Self::Never;
      }
      match std::env::var("COLOR").ok().as_deref() {
        Some("always") => Self::Always,
        Some("never") => Self::Never,
        _ => Self::Auto,
      }
    }

    #[cfg(target_arch = "wasm32")]
    {
      Self::Auto
    }
  }
}

pub fn is_tty() -> bool {
  #[cfg(not(target_arch = "wasm32"))]
  {
    atty::is(atty::Stream::Stderr)
  }

  #[cfg(target_arch = "wasm32")]
  {
    false
  }
}

#[allow(unused_variables)]
pub fn use_color(mode: CliColorMode) -> bool {
  match mode {
    CliColorMode::Always => true,
    CliColorMode::Never => false,
    CliColorMode::Auto => {
      #[cfg(target_arch = "wasm32")]
      {
        true
      }

      #[cfg(not(target_arch = "wasm32"))]
      {
        is_tty()
      }
    }
  }
}

#[allow(unused_variables)]
pub fn use_color_for_backtrace(mode: CliColorMode) -> bool {
  #[cfg(target_arch = "wasm32")]
  {
    true
  }

  #[cfg(not(target_arch = "wasm32"))]
  {
    if let Ok("1" | "true" | "yes") = std::env::var("COLORBT_FORCE").as_deref() {
      return true;
    }

    match std::env::var("COLORBT").as_deref() {
      Ok("never") => false,
      Ok("always") => true,
      _ => use_color(mode),
    }
  }
}

pub fn color_from_hex(hex: &str) -> Result<Style, Report> {
  let (r, g, b) = hex_to_rgb(hex).wrap_err("When converting hex to rgb")?;
  Ok(Style::new().fg(Color::Color256(rgb_to_ansi256(r, g, b))))
}

#[allow(clippy::string_slice)]
pub fn hex_to_rgb(hex: &str) -> Result<(u8, u8, u8), Report> {
  let hex = hex.trim_start_matches('#');

  if hex.len() != 6 {
    return make_error!("Invalid hex color format: {hex}");
  }

  let r = u8::from_str_radix(&hex[0..2], 16)?;
  let g = u8::from_str_radix(&hex[2..4], 16)?;
  let b = u8::from_str_radix(&hex[4..6], 16)?;

  Ok((r, g, b))
}

pub const fn rgb_to_ansi256(r: u8, g: u8, b: u8) -> u8 {
  if r == g && g == b {
    if r < 8 {
      16
    } else if r > 248 {
      231
    } else {
      ((r - 8) / 10) + 232
    }
  } else {
    16 + 36 * (r / 51) + 6 * (g / 51) + (b / 51)
  }
}
