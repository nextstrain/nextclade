use std::intrinsics::assert_zero_valid;
use std::ops::{Index, IndexMut};

/// Describes data layout of a single row in `Band2d`
#[derive(Debug, Clone)]
pub struct Stripe {
  pub begin: usize,
  pub end: usize,
}

impl Stripe {
  pub fn len(&self) -> usize {
    self.end - self.begin
  }

  pub fn is_empty(&self) -> bool {
    self.end == self.begin
  }
}

/// Represents a diagonal band in a matrix.
///
/// The underlying storage is sparse - the row storage consists of `Stripe`s, each of a given size (`stripe.length`)
/// and shifted by a given amount (`stripe.begin`) relative to the left boundary of the matrix. In each row, the cells
/// which are outside of the corresponding stripe are not allocated and accessing them is illegal.
pub struct Band2d<T>
where
  T: Default + Clone,
{
  data: Vec<T>,
  stripes: Vec<Stripe>,
  row_start_points: Vec<usize>,
  n_rows: usize,
  n_cols: usize,
}

impl<T> Band2d<T>
where
  T: Default + Clone,
{
  pub fn new(stripes: &[Stripe]) -> Self {
    let n_rows = stripes.len();

    let mut row_start_points = vec![0_usize; n_rows + 1];
    let mut n_cols = 0_usize;
    row_start_points[0] = 0;
    for (i, stripe) in stripes.iter().enumerate() {
      row_start_points[i + 1] = row_start_points[i] + stripe.len();
      n_cols = n_cols.max(stripe.end);
    }

    let data: Vec<T> = vec![T::default(); n_rows * n_cols];
    Self {
      data,
      stripes: stripes.to_vec(),
      row_start_points,
      n_rows,
      n_cols,
    }
  }

  #[inline]
  pub fn num_rows(&self) -> usize {
    self.n_rows
  }

  #[inline]
  pub fn num_cols(&self) -> usize {
    self.n_cols
  }

  #[inline]
  fn get_index(&self, index2d: (usize, usize)) -> usize {
    let (row, col) = index2d;
    let stripe = &self.stripes[row];
    assert!(stripe.begin <= col && col < stripe.end);
    self.row_start_points[row] + (col - stripe.begin)
  }

  #[inline]
  fn get_index_i32(&self, index2d: (i32, i32)) -> usize {
    let (row, col) = index2d;
    assert!(row >= 0);
    assert!(col >= 0);
    self.get_index((row as usize, col as usize))
  }
}

/// Allows 2-dimensional indexing using a tuple
impl<T: Default + Clone> Index<(usize, usize)> for Band2d<T> {
  type Output = T;

  #[inline]
  fn index(&self, index2d: (usize, usize)) -> &Self::Output {
    self.data.index(self.get_index(index2d))
  }
}

/// Allows 2-dimensional mutable indexing using a tuple
impl<T: Default + Clone> IndexMut<(usize, usize)> for Band2d<T> {
  #[inline]
  fn index_mut(&mut self, index2d: (usize, usize)) -> &mut Self::Output {
    self.data.index_mut(self.get_index(index2d))
  }
}

/// Allows 2-dimensional indexing using a tuple (version for i32)
impl<T: Default + Clone> Index<(i32, i32)> for Band2d<T> {
  type Output = T;

  #[inline]
  fn index(&self, index2d: (i32, i32)) -> &Self::Output {
    self.data.index(self.get_index_i32(index2d))
  }
}

/// Allows 2-dimensional mutable indexing using a tuple (version for i32)
impl<T: Default + Clone> IndexMut<(i32, i32)> for Band2d<T> {
  #[inline]
  fn index_mut(&mut self, index2d: (i32, i32)) -> &mut Self::Output {
    self.data.index_mut(self.get_index_i32(index2d))
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use eyre::Report;
  use itertools::assert_equal;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  /// Tests internals of the Band2d.
  /// We want to ensure that the implementation is sparse and memory-conscious.
  ///
  /// ```plaintext
  ///
  ///     0   1   2   3   4   5   6   7   8             stripes       row_start_points
  /// 0   X   X   X   .   .   .   .   .            begin: 0, end: 3         0
  /// 1   .   X   X   X   X   X   .   .            begin: 1, end: 6         3
  /// 2   .   .   X   X   X   X   .   .            begin: 2, end: 6         8
  /// 3   .   .   .   X   X   X   X   .            begin: 3, end: 7         12
  /// 4   .   .   .   .   X   X   X   X            begin: 4, end: 8         16
  /// 5   .   .   .   .   .   X   X   X            begin: 5, end: 8         20
  ///                         ^           ^
  ///                stripe.begin: 5   stripe.end: 8
  /// n_rows: 8
  /// n_cols: 6
  /// total_size = 23
  ///
  /// ```
  #[rstest]
  fn test_band_2d_internals() -> Result<(), Report> {
    let stripes = vec![
      Stripe { begin: 0, end: 3 },
      Stripe { begin: 1, end: 6 },
      Stripe { begin: 2, end: 6 },
      Stripe { begin: 3, end: 7 },
      Stripe { begin: 4, end: 8 },
      Stripe { begin: 5, end: 8 },
    ];

    let mut band = Band2d::<i32>::new(&stripes);

    band[(0, 0)] = 11;
    band[(0, 1)] = 12;
    band[(1, 1)] = 22;
    band[(5, 6)] = 67;
    band[(5, 7)] = 68;

    assert_eq!(band[(0, 0)], 11);
    assert_eq!(band[(0, 1)], 12);
    assert_eq!(band[(1, 1)], 22);
    assert_eq!(band[(5, 6)], 67);
    assert_eq!(band[(5, 7)], 68);

    assert_eq!(band.num_rows(), 6);
    assert_eq!(band.num_cols(), 8);

    assert_eq!(&band.row_start_points, &[0, 3, 8, 12, 16, 20, 23]);

    Ok(())
  }
}
