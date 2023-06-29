use crate::coord::range::NucAlnLocalRange;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::utils::wraparound::wraparound;

// Invalid/unset positions are set with this value
static POSITION_INVALID: i32 = -1;

struct FrameShiftDetector {
  frame_shifts: Vec<NucAlnLocalRange>, // List of detected frame shifts
  frame: i32,                          // Frame of the previously processed character (not necessarily n-1!)
  old_frame: i32,                      // Frame of the character before previous (not necessarily n-2!)
  begin: i32,                          // Remembers potential begin of the current frame shift range
  end: i32,                            // Remembers potential end of the current frame shift range
  last_indel: i32,                     // Remembers position of the last insertion of deletion
  dirty: bool,                         // Allows to avoid full run in `advance()` on every character
}

impl FrameShiftDetector {
  pub fn new(start_frame: i32) -> Self {
    Self {
      frame_shifts: vec![],
      frame: start_frame,
      old_frame: 0,
      begin: POSITION_INVALID,
      end: POSITION_INVALID,
      last_indel: POSITION_INVALID,
      dirty: false,
    }
  }

  /// Returns frame shifts detected so far */
  pub fn get_frame_shifts(&self) -> &[NucAlnLocalRange] {
    &self.frame_shifts
  }

  /// Call this for every insertion */
  pub fn add_insertion(&mut self, pos: i32) {
    self.update(-1, pos);
  }

  /// Call this for every deletion */
  pub fn add_deletion(&mut self, pos: i32) {
    self.update(1, pos);
  }

  /// Call this for every non-shifting character (not an indel) */
  pub fn advance(&mut self, pos: i32) {
    // Avoid full run in advance() on every character.
    // Only run 1 character when requested by setting `dirty = true` in `update()`.
    if !self.dirty {
      return;
    }

    if self.frame == 0 && self.begin != POSITION_INVALID {
      // We are not in shift and `begin` was set previously. This is the end of the shift range. Remember the range.
      debug_assert!(self.begin >= 0);
      debug_assert!(self.begin <= self.end);
      self
        .frame_shifts
        .push(NucAlnLocalRange::from_usize(self.begin as usize, self.end as usize));
      self.reset();
    }

    if self.frame != 0 && self.begin == POSITION_INVALID {
      // We are in the frame shift. This *might* be the the beginning of a shifted range. Note that it might also not
      // be, because there might be more non-shifting characters ahead.
      self.begin = pos;
    }

    self.dirty = false;
  }

  /// Run this after sequence iteration is over, with the length of the sequence */
  pub fn done(&mut self, pos: i32) {
    if self.begin != POSITION_INVALID {
      debug_assert!(self.begin >= 0);
      debug_assert!(self.begin <= pos);
      self
        .frame_shifts
        .push(NucAlnLocalRange::from_usize(self.begin as usize, pos as usize));
      self.reset();
    }
  }

  /** Resets the state of the detector */
  pub fn reset(&mut self) {
    self.begin = POSITION_INVALID;
    self.end = POSITION_INVALID;
    self.last_indel = POSITION_INVALID;
  }

  /// Updates detector's state
  fn update(&mut self, shift: i32, pos: i32) {
    self.old_frame = self.frame;
    self.frame += shift;
    self.frame = wraparound(self.frame, 3);

    // Whether transitioned from no shift to shift
    let to_shift = self.old_frame == 0 && self.frame != 0;

    // Whether transitioned from shift to no shift
    let to_no_shift = self.old_frame != 0 && self.frame == 0;

    // Whether the previous character is an insertion or a deletion
    let prev_is_indel = pos - self.last_indel == 1;

    if !prev_is_indel {
      // Previous character is non-shifting, so it *might* be the end of the shift. Note that it might also not be,
      // because there might be more non-shifting characters ahead in the same shifted range.
      self.end = pos;
    }

    if to_shift || to_no_shift {
      // Transitioned from shift or to shift, mark the next character for the full run in `advance()`.
      self.dirty = true;
    }

    self.last_indel = pos;
  }
}

/// Detects nucleotide frame shifts in the query sequence
/// and the corresponding aminoacid frame shifts in the query peptide
pub fn frame_shifts_detect(qry_gene_seq: &[Nuc], ref_gene_seq: &[Nuc]) -> Vec<NucAlnLocalRange> {
  debug_assert_eq!(ref_gene_seq.len(), qry_gene_seq.len());
  let length = ref_gene_seq.len() as i32;

  let mut detector = FrameShiftDetector::new(0);
  for pos in 0..length {
    if ref_gene_seq[pos as usize].is_gap() {
      detector.add_insertion(pos);
    } else if qry_gene_seq[pos as usize].is_gap() {
      detector.add_deletion(pos);
    } else {
      detector.advance(pos);
    }
  }
  detector.done(length);

  detector.get_frame_shifts().to_vec()
}
