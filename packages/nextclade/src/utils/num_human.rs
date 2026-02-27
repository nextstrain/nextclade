/// Grouping style for digit separation
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Grouping {
  /// Digits separated into groups of three (e.g., 10,000,000)
  #[default]
  Standard,
  /// First three digits grouped, then groups of two (e.g., 1,00,00,000) - Indian/South Asian
  Indian,
  /// No grouping (e.g., 10000000)
  None,
}

/// Compact notation style for large numbers
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum CompactStyle {
  /// Use suffixes: K (thousands), M (millions), B (billions), T (trillions)
  #[default]
  Short,
  /// Disable compact notation, always use full number with separators
  Off,
}

/// Configuration for human-readable number formatting
#[derive(Clone, Debug)]
pub struct HumanFormat {
  separator: char,
  grouping: Grouping,
  compact_style: CompactStyle,
  compact_threshold: u64,
  compact_decimals: u8,
}

impl Default for HumanFormat {
  fn default() -> Self {
    Self {
      separator: ',',
      grouping: Grouping::Standard,
      compact_style: CompactStyle::Short,
      compact_threshold: 1_000_000,
      compact_decimals: 1,
    }
  }
}

impl HumanFormat {
  pub fn new() -> Self {
    Self::default()
  }

  /// Set the thousands separator character (default: ',')
  pub fn separator(mut self, sep: char) -> Self {
    self.separator = sep;
    self
  }

  /// Set the digit grouping style (default: Standard)
  pub fn grouping(mut self, grouping: Grouping) -> Self {
    self.grouping = grouping;
    self
  }

  /// Set the compact notation style (default: Short)
  pub fn compact_style(mut self, style: CompactStyle) -> Self {
    self.compact_style = style;
    self
  }

  /// Set the threshold above which compact notation is used (default: 1,000,000)
  pub fn compact_threshold(mut self, threshold: u64) -> Self {
    self.compact_threshold = threshold;
    self
  }

  /// Set decimal places for compact notation (default: 1)
  pub fn compact_decimals(mut self, decimals: u8) -> Self {
    self.compact_decimals = decimals;
    self
  }

  /// Format a number for human readability. Infallible - always returns valid output.
  pub fn format(&self, n: u64) -> String {
    if self.compact_style == CompactStyle::Short && n >= self.compact_threshold {
      self.format_compact(n)
    } else {
      self.format_separated(n)
    }
  }

  fn format_compact(&self, n: u64) -> String {
    const SCALES: [(u64, char); 4] = [
      (1_000_000_000_000, 'T'),
      (1_000_000_000, 'B'),
      (1_000_000, 'M'),
      (1_000, 'K'),
    ];

    let Some((divisor, suffix)) = SCALES.iter().find(|(threshold, _)| n >= *threshold).copied() else {
      return self.format_separated(n);
    };

    let value = n as f64 / divisor as f64;
    let decimals = self.compact_decimals as usize;
    if decimals == 0 || value >= 10.0 {
      format!("{value:.0}{suffix}")
    } else {
      format!("{value:.decimals$}{suffix}")
    }
  }

  fn format_separated(&self, n: u64) -> String {
    if self.grouping == Grouping::None {
      return n.to_string();
    }

    let s = n.to_string();
    let bytes = s.as_bytes();
    let len = bytes.len();

    if len <= 3 {
      return s;
    }

    let sep = self.separator;
    let estimated_seps = len / 2;
    let mut result = String::with_capacity(len + estimated_seps);

    match self.grouping {
      Grouping::Standard => {
        for (i, &byte) in bytes.iter().enumerate() {
          if i > 0 && (len - i).is_multiple_of(3) {
            result.push(sep);
          }
          result.push(byte as char);
        }
      }
      Grouping::Indian => {
        for (i, &byte) in bytes.iter().enumerate() {
          let remaining = len - i;
          if i > 0 && (remaining == 3 || (remaining > 3 && (remaining - 3).is_multiple_of(2))) {
            result.push(sep);
          }
          result.push(byte as char);
        }
      }
      Grouping::None => {
        return s;
      }
    }

    result
  }
}

/// Format a number for human readability using default settings.
///
/// - < 1,000,000: with thousand separators (e.g., "179,151")
/// - >= 1,000,000: in millions (e.g., "1.5M")
/// - >= 1,000,000,000: in billions (e.g., "3.7B")
/// - >= 1,000,000,000,000: in trillions (e.g., "2.1T")
pub fn format_number_human(n: u64) -> String {
  HumanFormat::default().format(n)
}

#[cfg(test)]
mod tests {
  use super::*;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  #[case(0, "0")]
  #[case(1, "1")]
  #[case(12, "12")]
  #[case(123, "123")]
  #[case(1_234, "1,234")]
  #[case(12_345, "12,345")]
  #[case(123_456, "123,456")]
  #[case(999_999, "999,999")]
  fn test_format_with_separators(#[case] input: u64, #[case] expected: &str) {
    let actual = format_number_human(input);
    assert_eq!(expected, actual);
  }

  #[rstest]
  #[case(1_000_000, "1.0M")]
  #[case(1_500_000, "1.5M")]
  #[case(10_000_000, "10M")]
  #[case(100_000_000, "100M")]
  #[case(999_999_999, "1000M")]
  fn test_format_millions(#[case] input: u64, #[case] expected: &str) {
    let actual = format_number_human(input);
    assert_eq!(expected, actual);
  }

  #[rstest]
  #[case(1_000_000_000, "1.0B")]
  #[case(3_700_000_000, "3.7B")]
  #[case(10_000_000_000, "10B")]
  #[case(100_000_000_000, "100B")]
  fn test_format_billions(#[case] input: u64, #[case] expected: &str) {
    let actual = format_number_human(input);
    assert_eq!(expected, actual);
  }

  #[rstest]
  #[case(1_000_000_000_000, "1.0T")]
  #[case(2_500_000_000_000, "2.5T")]
  #[case(10_000_000_000_000, "10T")]
  fn test_format_trillions(#[case] input: u64, #[case] expected: &str) {
    let actual = format_number_human(input);
    assert_eq!(expected, actual);
  }

  #[test]
  fn test_custom_separator() {
    let fmt = HumanFormat::new().separator(' ').compact_style(CompactStyle::Off);
    let actual = fmt.format(1_234_567);
    assert_eq!("1 234 567", actual);
  }

  #[test]
  fn test_no_grouping() {
    let fmt = HumanFormat::new()
      .grouping(Grouping::None)
      .compact_style(CompactStyle::Off);
    let actual = fmt.format(1_234_567);
    assert_eq!("1234567", actual);
  }

  #[test]
  fn test_indian_grouping() {
    let fmt = HumanFormat::new()
      .grouping(Grouping::Indian)
      .compact_style(CompactStyle::Off);
    let actual = fmt.format(10_000_000);
    assert_eq!("1,00,00,000", actual);
  }

  #[test]
  fn test_compact_off() {
    let fmt = HumanFormat::new().compact_style(CompactStyle::Off);
    let actual = fmt.format(1_000_000);
    assert_eq!("1,000,000", actual);
  }

  #[test]
  fn test_custom_compact_threshold() {
    let fmt = HumanFormat::new().compact_threshold(10_000);
    let actual = fmt.format(50_000);
    assert_eq!("50K", actual);
  }

  #[test]
  fn test_zero_decimals() {
    let fmt = HumanFormat::new().compact_decimals(0);
    let actual = fmt.format(1_500_000);
    assert_eq!("2M", actual);
  }

  #[test]
  fn test_two_decimals() {
    let fmt = HumanFormat::new().compact_decimals(2);
    let actual = fmt.format(1_234_000);
    assert_eq!("1.23M", actual);
  }
}
