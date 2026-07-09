//! HMM-based recombination detection.
//!
//! A two-state hidden Markov model (wildtype, recombinant) decoded with Viterbi and optionally scored
//! with forward-backward. Each reference site emits one of three observations relative to the
//! sequence's inferred parent (its tree attachment point): not mutated (`Ref`), mutated (`Mut`), or no
//! usable information (`Missing`). `Missing` emits probability 1 in both states (marginalization over
//! missing data), so it adds no emission evidence while transitions still cross it and the decoded
//! state persists across missing runs. Contiguous runs of the recombinant state, trimmed so their
//! endpoints fall on covered positions, are reported as putative recombinant intervals. When
//! forward-backward is run, each interval receives a confidence score (mean posterior marginal
//! probability of the recombinant state).
//!
//! The detector is split by concern:
//! - [`params`]: the three-parameter emission/transition model and its invariants
//! - [`observations`]: the per-site observation vector in reference coordinates
//! - [`decode`]: Viterbi decoding and recombinant-interval extraction
//! - [`forward_backward`]: posterior marginals and per-interval confidence scores
//! - [`config`]: `pathogen.json` configuration
//! - [`result`]: the per-sequence result data model
//! - [`estimate`]: resolving the parameters from the reference tree

pub mod config;
pub mod decode;
pub mod estimate;
pub mod forward_backward;
pub mod observations;
pub mod params;
pub mod result;

#[cfg(test)]
mod __tests__;
