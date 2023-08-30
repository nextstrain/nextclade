use crate::alphabet::letter::Letter;

pub fn remove_gaps_in_place<T: Letter<T>>(seq: &mut Vec<T>) {
  seq.retain(|c| !T::is_gap(c));
}
