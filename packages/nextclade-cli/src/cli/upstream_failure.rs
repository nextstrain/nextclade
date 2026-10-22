//! Failure of a thread that sends records to the writer thread of `nextclade run` or `nextclade sort`.
//!
//! When the reader or an analysis thread fails, the writer receives only some of the records. It must not finish
//! its outputs then, because they would look complete. It drops them instead, so that each output warns that it is
//! incomplete, and the failed thread reports its error.

use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Debug, Default)]
pub struct UpstreamFailure {
  has_failed: AtomicBool,
}

impl UpstreamFailure {
  /// Remember that a thread failed. Call it before the thread drops its channel ends, so that the writer sees the
  /// failure when its channel closes.
  pub fn mark_failed(&self) {
    self.has_failed.store(true, Ordering::Release);
  }

  /// Whether a thread failed before it sent all of its records
  pub fn has_failed(&self) -> bool {
    self.has_failed.load(Ordering::Acquire)
  }
}
