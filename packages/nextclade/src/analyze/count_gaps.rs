use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;

#[derive(Default)]
pub struct GapCounts {
  pub len: usize,
  pub leading: usize,
  pub internal: usize,
  pub trailing: usize,
  pub total: usize,
}

impl GapCounts {
  pub fn new(seq: &[Nuc]) -> Self {
    let len = seq.len();

    if len == 0 {
      return Self::default();
    }

    if len == 1 {
      let leading = if seq[0].is_gap() { 1 } else { 0 };
      return Self {
        len,
        leading,
        internal: 0,
        trailing: 0,
        total: 0,
      };
    }

    // Rewind forward until the first non-gap
    let mut begin = 0;
    while begin < len && seq[begin].is_gap() {
      begin += 1;
    }

    // Rewind backwards starting from the end, until the first non-gap
    let mut end = len - 1;
    while end > begin && seq[end].is_gap() {
      end -= 1;
    }

    // Count gaps in the internal region
    let internal = if end > begin {
      seq[begin..end].iter().filter(|nuc| nuc.is_gap()).count()
    } else {
      0
    };

    let leading = begin;
    let trailing = len - end - 1;
    let total = leading + internal + trailing;

    Self {
      len,
      leading,
      internal,
      trailing,
      total,
    }
  }

  pub const fn is_all_gaps(&self) -> bool {
    self.total >= self.len
  }
}
