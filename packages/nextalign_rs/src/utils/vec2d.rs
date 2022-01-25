use std::ops::{Index, IndexMut};

/// Row-major, 2-dimensional container with contiguous, flat underlying storage
/// and 2-dimensional indexing.
pub struct Vec2d<T: Default + Clone> {
  data: Vec<T>,
  n_rows: usize,
  n_cols: usize,
}

impl<T: Default + Clone> Vec2d<T> {
  pub fn new(n_rows: usize, n_cols: usize) -> Self {
    let data: Vec<T> = vec![T::default(); n_rows * n_cols];
    Self { data, n_rows, n_cols }
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
    row * self.n_cols + col
  }

  #[inline]
  fn get_index_i32(&self, index2d: (i32, i32)) -> usize {
    let (row, col) = index2d;
    (row * self.n_cols as i32 + col) as usize
  }
}

/// Allows 2-dimensional indexing using a tuple:
///  arr[(row, col)]
impl<T: Default + Clone> Index<(usize, usize)> for Vec2d<T> {
  type Output = T;
  #[inline]

  fn index(&self, index2d: (usize, usize)) -> &Self::Output {
    self.data.index(self.get_index(index2d))
  }
}

/// Allows 2-dimensional mutable indexing using a tuple:
///  arr[(row, col)]
impl<T: Default + Clone> IndexMut<(usize, usize)> for Vec2d<T> {
  fn index_mut(&mut self, index2d: (usize, usize)) -> &mut Self::Output {
    self.data.index_mut(self.get_index(index2d))
  }
}

/// Allows 2-dimensional indexing using a tuple:
///  arr[(row, col)]
impl<T: Default + Clone> Index<(i32, i32)> for Vec2d<T> {
  type Output = T;
  #[inline]

  fn index(&self, index2d: (i32, i32)) -> &Self::Output {
    self.data.index(self.get_index_i32(index2d))
  }
}

/// Allows 2-dimensional mutable indexing using a tuple:
///  arr[(row, col)]
impl<T: Default + Clone> IndexMut<(i32, i32)> for Vec2d<T> {
  fn index_mut(&mut self, index2d: (i32, i32)) -> &mut Self::Output {
    self.data.index_mut(self.get_index_i32(index2d))
  }
}
