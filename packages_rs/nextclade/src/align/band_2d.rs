use std::ops::{Index, IndexMut};

/// Describes data layout of a single row in `Band2d`
#[derive(Debug, Clone)]
pub struct Stripe {
  begin: usize,
  length: usize,
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
      let stripe_end = row_start_points[i] + stripe.length;
      row_start_points[i + 1] = stripe_end;
      n_cols = n_cols.max(stripe.begin + stripe.length);
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
    assert!(stripe.begin <= col && col < stripe.begin + stripe.length);
    self.row_start_points[row] + (col - stripe.begin)
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
  ///     0   1   2   3   4   5   6   7            stripes                 row_start_points
  /// 0   X   X   X   .   .   .   .   .            begin: 0, length: 3     0
  /// 1   .   X   X   X   X   X   .   .            begin: 1, length: 5     3
  /// 2   .   .   X   X   X   X   .   .            begin: 2, length: 4     8
  /// 3   .   .   .   X   X   X   X   .            begin: 3, length: 4     12
  /// 4   .   .   .   .   X   X   X   X            begin: 4, length: 4     16
  /// 5   .   .   .   .   .   X   X   X            begin: 5, length: 3     20
  ///                         ^       ^
  ///                     begin: 5  length: 3
  /// total_size = 23
  /// n_rows: 8
  /// n_cols: 6
  ///
  /// ```
  #[rstest]
  fn test_band_2d_internals() -> Result<(), Report> {
    let stripes = vec![
      Stripe { begin: 0, length: 3 },
      Stripe { begin: 1, length: 5 },
      Stripe { begin: 2, length: 4 },
      Stripe { begin: 3, length: 4 },
      Stripe { begin: 4, length: 4 },
      Stripe { begin: 5, length: 3 },
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

    assert_eq!(band.data[0], 11);
    assert_eq!(band.data[1], 12);
    assert_eq!(band.data[3], 22);

    assert_eq!(band.data[21], 67);
    assert_eq!(band.data[22], 68);

    assert_eq!(&band.row_start_points, &[0, 3, 8, 12, 16, 20, 23]);

    Ok(())
  }
}
