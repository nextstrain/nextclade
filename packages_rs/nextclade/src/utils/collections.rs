pub fn concat_to_vec<T: Clone>(x: &[T], y: &[T]) -> Vec<T> {
  [x, y].into_iter().flatten().cloned().collect()
}

#[macro_export(local_inner_macros)]
macro_rules! hash_set {
  () => (
    std::collections::HashSet::<_, std::collections::hash_map::RandomState>::new()
  );
  ($($x:expr),+ $(,)?) => (
    std::collections::HashSet::<_, std::collections::hash_map::RandomState>::from_iter(std::vec![$($x),+])
  );
}

#[macro_export(local_inner_macros)]
macro_rules! hash_map {
  () => (
    std::collections::HashMap::<_, std::collections::hash_map::RandomState>::new()
  );
  ($($x:expr),+ $(,)?) => (
    std::collections::HashMap::<_, std::collections::hash_map::RandomState>::from_iter(std::vec![$($x),+])
  );
}

pub use hash_map;
pub use hash_set;
