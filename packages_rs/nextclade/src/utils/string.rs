#[macro_export]
macro_rules! o {
  ($x:expr $(,)?) => {
    ToOwned::to_owned($x)
  };
}
