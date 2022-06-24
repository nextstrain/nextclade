/// concat.rs
///
/// Taken with modifications from
/// https://github.com/frangio/concat.rs/blob/d416d3b3c03ba18c0541b7fa63e6e89f3c43e0fe/src/lib.rs
///
/// Credits: Francisco (@frangio)
///
/// Provides the Concat reader adaptor, which wraps around an iterator of readers and exposes its
/// items' contents sequentially. Thus, the contents read from a Concat instance will be the
/// concatenation of the items' contents.
use std::io::{Read, Result};

pub fn concat<I>(iter: I) -> Concat<I>
where
  I: Iterator,
  <I as Iterator>::Item: Read,
{
  Concat::<I>::from(iter)
}

pub struct Concat<I>
where
  I: Iterator,
  <I as Iterator>::Item: Read,
{
  iter: I,
  curr: Option<<I as Iterator>::Item>,
}

impl<I> Concat<I>
where
  I: Iterator,
  <I as Iterator>::Item: Read,
{
  /// Returns a reference to the item last read, or None if the iterator has been exhausted.
  ///
  /// This is useful for error handling and reporting: if a read operation fails, the reference
  /// returned will point to the item which caused the the error.
  pub fn current(&self) -> Option<&<I as Iterator>::Item> {
    self.curr.as_ref()
  }
}

impl<I> From<I> for Concat<I>
where
  I: Iterator,
  <I as Iterator>::Item: Read,
{
  fn from(mut iter: I) -> Concat<I> {
    let curr = iter.next();

    Concat { iter, curr }
  }
}

impl<I> Read for Concat<I>
where
  I: Iterator,
  <I as Iterator>::Item: Read,
{
  fn read(&mut self, buf: &mut [u8]) -> Result<usize> {
    let n = match self.curr {
      None => 0,
      Some(ref mut r) => r.read(buf)?,
    };

    if n > 0 || buf.is_empty() || self.curr.is_none() {
      Ok(n)
    } else {
      // The current reader reached the end so we have to advance the iterator and try again.
      self.curr = self.iter.next();
      self.read(buf)
    }
  }
}
