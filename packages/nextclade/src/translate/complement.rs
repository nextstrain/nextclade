use crate::alphabet::nuc::Nuc;

pub const fn complement(nuc: Nuc) -> Nuc {
  match nuc {
    Nuc::A => Nuc::T,
    Nuc::C => Nuc::G,
    Nuc::G => Nuc::C,
    Nuc::T => Nuc::A,
    Nuc::Y => Nuc::R,
    Nuc::R => Nuc::Y,
    Nuc::W => Nuc::W,
    Nuc::S => Nuc::S,
    Nuc::K => Nuc::M,
    Nuc::M => Nuc::K,
    Nuc::D => Nuc::H,
    Nuc::V => Nuc::B,
    Nuc::H => Nuc::D,
    Nuc::B => Nuc::V,
    Nuc::N => Nuc::N,
    Nuc::Gap => Nuc::Gap,
  }
}

pub fn reverse_complement_in_place(seq: &mut [Nuc]) {
  seq.reverse();
  seq.iter_mut().for_each(|nuc| *nuc = complement(*nuc));
}
