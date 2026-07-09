//! Shared fixtures and oracles for the recombination and recombination-estimate test modules.
//!
//! Split out so the topic-scoped `test_recombination_*` files and `test_recombination_estimate`
//! reuse the same observation builders, tree fixtures, and independent brute-force oracles without
//! duplicating them. The whole `__tests__` subtree is `#[cfg(test)]`-gated by its parent module, so
//! these `pub` items are reachable only within the test build.

use crate::alphabet::nuc::Nuc;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::recombination::config::RecombinationConfig;
use crate::analyze::recombination::estimate::RecombinationResolution;
use crate::analyze::recombination::forward_backward::log_sum_exp_2;
use crate::analyze::recombination::observations::RecombinationObs;
use crate::analyze::recombination::params::{RECOMBINANT, RecombinationHmmParams, WILDTYPE};
use crate::analyze::recombination::result::RecombinationRegion;
use crate::coord::range::NucRefGlobalRange;
use crate::tree::tree::{AuspiceGraph, AuspiceTree};
use indoc::indoc;

/// Reference length used by the estimate tests. Fixtures place mutations well inside this bound so the
/// per-site rates are simple `count / REF_LEN` fractions.
pub const REF_LEN: usize = 100;

// Test-scale parameters chosen so short fixtures decode with clean interval boundaries. At
// genome scale gamma ~ 1/L makes state switches so costly that boundaries only resolve over
// hundreds of sites (correct sticky-state behavior), which cannot be exercised on L~50 inputs.
// Here the per-site signals are:
//   switch cost      c   = ln((1-gamma)/gamma) = ln(0.95/0.05) ~ 2.94 nats
//   Mut -> recombinant    = ln(mu_r/mu_w)      = ln(0.5/0.05)  ~ 2.30 nats
//   Ref -> wildtype       = ln((1-mu_w)/(1-mu_r)) = ln(0.95/0.5) ~ 0.64 nats
// so a block needs > ~3 Mut to overcome one switch (> ~6 to open and close an interval), and a
// flank needs > ~5 Ref to justify switching back to wildtype.
pub fn test_params() -> RecombinationHmmParams {
  RecombinationHmmParams::new(0.05, 0.05, 0.5).unwrap()
}

/// Build an observation vector from a compact string: `R`=Ref, `M`=Mut, `X`=Missing.
pub fn obs(s: &str) -> Vec<RecombinationObs> {
  s.chars()
    .map(|c| match c {
      'R' => RecombinationObs::Ref,
      'M' => RecombinationObs::Mut,
      'X' => RecombinationObs::Missing,
      other => panic!("unexpected observation char: {other}"),
    })
    .collect()
}

pub fn ranges(pairs: &[(usize, usize)]) -> Vec<NucRefGlobalRange> {
  pairs
    .iter()
    .map(|&(b, e)| NucRefGlobalRange::from_usize(b, e))
    .collect()
}

pub fn region(begin: usize, end: usize, confidence: Option<f64>) -> RecombinationRegion {
  RecombinationRegion {
    range: NucRefGlobalRange::from_usize(begin, end),
    length: end - begin,
    confidence,
  }
}

pub fn nuc_range(begin: usize, end: usize) -> NucRange {
  NucRange {
    range: NucRefGlobalRange::from_usize(begin, end),
    letter: Nuc::N,
  }
}

pub fn cfg_min_subs(n: usize) -> RecombinationConfig {
  RecombinationConfig {
    min_private_subs_to_run: Some(n),
    ..RecombinationConfig::default()
  }
}

/// Total log-probability of a hidden-state path under the model: uniform prior, per-site emissions,
/// and per-step transitions. Independent of the Viterbi implementation, so it is a valid oracle.
pub fn path_log_prob(obs: &[RecombinationObs], states: &[bool], params: &RecombinationHmmParams) -> f64 {
  let log_stay = (1.0 - params.gamma()).ln();
  let log_switch = params.gamma().ln();
  let state_idx = |recombinant: bool| if recombinant { RECOMBINANT } else { WILDTYPE };
  let mut total = 0.5_f64.ln() + params.log_emission(obs[0])[state_idx(states[0])];
  for l in 1..obs.len() {
    total += if states[l] == states[l - 1] {
      log_stay
    } else {
      log_switch
    };
    total += params.log_emission(obs[l])[state_idx(states[l])];
  }
  total
}

/// Independent brute-force posterior marginals: enumerate all `2^L` hidden-state paths, weight each
/// by its joint log-probability [`path_log_prob`], and marginalize per site into
/// `[P(wildtype), P(recombinant)]`. `O(2^L)`, tractable only for short vectors, but a genuine oracle
/// for the forward-backward recurrence -- a different algorithm than the alpha/beta dynamic program.
pub fn bruteforce_marginals(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<[f64; 2]> {
  let n = obs.len();
  let paths: Vec<Vec<bool>> = (0..(1_u32 << n))
    .map(|mask| (0..n).map(|i| (mask >> i) & 1 == 1).collect())
    .collect();
  let log_joint: Vec<f64> = paths.iter().map(|path| path_log_prob(obs, path, params)).collect();
  let log_total = log_joint.iter().copied().fold(f64::NEG_INFINITY, log_sum_exp_2);

  (0..n)
    .map(|site| {
      let log_marginal = |recombinant: bool| {
        paths
          .iter()
          .zip(&log_joint)
          .filter(|(path, _)| path[site] == recombinant)
          .map(|(_, &lj)| lj)
          .fold(f64::NEG_INFINITY, log_sum_exp_2)
      };
      [
        (log_marginal(false) - log_total).exp(),
        (log_marginal(true) - log_total).exp(),
      ]
    })
    .collect()
}

/// Unwrap a resolution to its parameters, panicking with context otherwise.
pub fn resolved(resolution: RecombinationResolution) -> RecombinationHmmParams {
  match resolution {
    RecombinationResolution::Resolved(params) => params,
    skipped @ RecombinationResolution::Skipped(_) => panic!("expected resolved parameters, got {skipped:?}"),
  }
}

// Two clades A and B. Leaves: A1 (2 nuc muts), B1 (1 mut on B + 1 own = rd 2), B2 (1 + 3 = rd 4).
// Mean terminal branch length = (2+1+3)/3 = 2 -> mu_w = 2/100 = 0.02.
// Inter-clade leaf pairs: A1<->B1 = 2+2-0 = 4, A1<->B2 = 2+4-0 = 6.
// median{4, 6} = 5 -> mu_r = 5/100 = 0.05. gamma = 1/100 = 0.01.
pub fn two_clade_tree() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "A1",
          "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
          "branch_attrs": { "mutations": { "nuc": ["A10C", "A20G"] } }
        },
        {
          "name": "B",
          "node_attrs": { "div": 1, "clade_membership": { "value": "B" } },
          "branch_attrs": { "mutations": { "nuc": ["A30T"] } },
          "children": [
            {
              "name": "B1",
              "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
              "branch_attrs": { "mutations": { "nuc": ["A40C"] } }
            },
            {
              "name": "B2",
              "node_attrs": { "div": 4, "clade_membership": { "value": "B" } },
              "branch_attrs": { "mutations": { "nuc": ["A50C", "A60G", "A70T"] } }
            }
          ]
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

// Three clades A, B, C. An unlabeled internal node I (1 mut) parents leaves A1 (clade A, 2 muts)
// and B1 (clade B, 4 muts); leaf C1 (clade C, 6 muts) hangs off the root. A1 and B1 share the
// non-root MRCA I, exercising the `- 2 * root_distance(mrca)` term with a non-root common ancestor.
pub fn three_clade_tree() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "I",
          "node_attrs": { "div": 1 },
          "branch_attrs": { "mutations": { "nuc": ["A5C"] } },
          "children": [
            {
              "name": "A1",
              "node_attrs": { "div": 3, "clade_membership": { "value": "A" } },
              "branch_attrs": { "mutations": { "nuc": ["A10C", "A20G"] } }
            },
            {
              "name": "B1",
              "node_attrs": { "div": 5, "clade_membership": { "value": "B" } },
              "branch_attrs": { "mutations": { "nuc": ["A30T", "A40C", "A50G", "A60T"] } }
            }
          ]
        },
        {
          "name": "C1",
          "node_attrs": { "div": 6, "clade_membership": { "value": "C" } },
          "branch_attrs": { "mutations": { "nuc": ["A70C", "A80G", "A90T", "A100C", "A110G", "A120T"] } }
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

// Nested clades: "child" is nested inside "parent", their most recent common ancestors one mutation
// apart, but the "child" leaves carry large terminal branches. This exercises that mu_r is the
// inter-clade leaf distance (mu_r=0.09 here), driven by the leaves rather than by how close the
// clade ancestors sit on the tree.
//
//   root (0 muts)
//   |-- P (1 mut, clade "parent")
//   |   |-- P1 (1 mut, clade "parent") -- leaf, rd=2
//   |   |-- C (1 mut, clade "child")
//   |   |   |-- C1 (8 muts, clade "child") -- leaf, rd=10
//   |   |   +-- C2 (6 muts, clade "child") -- leaf, rd=8
//   |   +-- P2 (1 mut, clade "parent") -- leaf, rd=2
//   +-- O1 (4 muts, clade "other") -- leaf, rd=4
pub fn nested_clade_tree() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "P",
          "node_attrs": { "div": 1, "clade_membership": { "value": "parent" } },
          "branch_attrs": { "mutations": { "nuc": ["A1C"] } },
          "children": [
            {
              "name": "P1",
              "node_attrs": { "div": 2, "clade_membership": { "value": "parent" } },
              "branch_attrs": { "mutations": { "nuc": ["A2C"] } }
            },
            {
              "name": "C",
              "node_attrs": { "div": 2, "clade_membership": { "value": "child" } },
              "branch_attrs": { "mutations": { "nuc": ["A3C"] } },
              "children": [
                {
                  "name": "C1",
                  "node_attrs": { "div": 10, "clade_membership": { "value": "child" } },
                  "branch_attrs": { "mutations": { "nuc": ["A10C","A11C","A12C","A13C","A14C","A15C","A16C","A17C"] } }
                },
                {
                  "name": "C2",
                  "node_attrs": { "div": 8, "clade_membership": { "value": "child" } },
                  "branch_attrs": { "mutations": { "nuc": ["A20C","A21C","A22C","A23C","A24C","A25C"] } }
                }
              ]
            },
            {
              "name": "P2",
              "node_attrs": { "div": 2, "clade_membership": { "value": "parent" } },
              "branch_attrs": { "mutations": { "nuc": ["A30C"] } }
            }
          ]
        },
        {
          "name": "O1",
          "node_attrs": { "div": 4, "clade_membership": { "value": "other" } },
          "branch_attrs": { "mutations": { "nuc": ["A40C","A41C","A42C","A43C"] } }
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

pub fn single_clade_tree() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "L1",
          "node_attrs": { "div": 1, "clade_membership": { "value": "A" } },
          "branch_attrs": { "mutations": { "nuc": ["A10C"] } }
        },
        {
          "name": "L2",
          "node_attrs": { "div": 1, "clade_membership": { "value": "A" } },
          "branch_attrs": { "mutations": { "nuc": ["A20G"] } }
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

// Augur/TreeTime-style reference tree whose `nuc` branch mutations include a deletion (`A15-`),
// which Nextclade-built trees never emit. C3: deletions are excluded from the mutation count.
// Two clades A, B. Terminal branches by substitution count (deletions ignored): A1=2, B=1, B1=1.
// With the deletion on B1 excluded, its terminal branch is 1 (the substitution A40C only), so mean
// terminal length = (2+1)/2 = 1.5 -> mu_w = 0.015. Were the deletion counted, B1 would be 2 and the
// mean would differ.
pub fn external_tree_with_deletion() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "A1",
          "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
          "branch_attrs": { "mutations": { "nuc": ["A10C", "A20G"] } }
        },
        {
          "name": "B1",
          "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
          "branch_attrs": { "mutations": { "nuc": ["A40C", "A15-"] } }
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

// A tree where a clade label appears only on an internal node, not on any leaf. Leaves carry a
// single clade ("A"), so leaf-clade count is 1 and mu_r is undefined. C7: the skip reason must be
// FewerThanTwoClades (derived from leaf clades), not TreeEstimateUnavailable.
pub fn internal_only_second_clade_tree() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "I",
          "node_attrs": { "div": 1, "clade_membership": { "value": "B" } },
          "branch_attrs": { "mutations": { "nuc": ["A5C"] } },
          "children": [
            {
              "name": "A1",
              "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
              "branch_attrs": { "mutations": { "nuc": ["A10C"] } }
            },
            {
              "name": "A2",
              "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
              "branch_attrs": { "mutations": { "nuc": ["A20G"] } }
            }
          ]
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

// Two clades but no per-branch nucleotide mutations (a tree exported with only divergence values).
// Every branch mutation count is zero, so the divergence rates are undefined.
pub fn two_clade_no_mutations_tree() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        { "name": "A1", "node_attrs": { "div": 1, "clade_membership": { "value": "A" } } },
        { "name": "B1", "node_attrs": { "div": 1, "clade_membership": { "value": "B" } } }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

// Two clades; leaf B1 carries a substitution and an insertion ("-10A"). Insertions have a query base
// present (not a gap), so they are counted alongside substitutions: A1=2, B1=2 -> mean 2 -> mu_w=0.02.
pub fn tree_with_insertion() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "A1",
          "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
          "branch_attrs": { "mutations": { "nuc": ["A10C", "A20G"] } }
        },
        {
          "name": "B1",
          "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
          "branch_attrs": { "mutations": { "nuc": ["A40C", "-10A"] } }
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}

// A leaf whose `nuc` branch mutation does not parse as `<ref><pos><query>`.
pub fn tree_with_malformed_mutation() -> AuspiceGraph {
  let json = indoc! {r#"{
    "version": "v2",
    "meta": {},
    "tree": {
      "name": "root",
      "node_attrs": { "div": 0 },
      "children": [
        {
          "name": "A1",
          "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
          "branch_attrs": { "mutations": { "nuc": ["not-a-mutation"] } }
        },
        {
          "name": "B1",
          "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
          "branch_attrs": { "mutations": { "nuc": ["A40C"] } }
        }
      ]
    }
  }"#};
  AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
}
