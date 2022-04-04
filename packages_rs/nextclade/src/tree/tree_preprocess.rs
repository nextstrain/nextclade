use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::nuc_sub::NucSub;
use crate::io::aa::Aa;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::translate::translate_genes::Translation;
use crate::tree::tree::{
  AuspiceColoring, AuspiceTree, AuspiceTreeNode, DivergenceUnits, TreeNodeAttr, AUSPICE_UNKNOWN_VALUE,
};
use crate::utils::collections::concat_to_vec;
use crate::{make_error, make_internal_report};
use eyre::Report;
use itertools::Itertools;
use num::Float;
use serde_json::Value;
use std::collections::BTreeMap;
use std::str::FromStr;

pub fn tree_preprocess_in_place(
  tree: &mut AuspiceTree,
  ref_seq: &[Nuc],
  ref_peptides: &BTreeMap<String, Translation>,
) -> Result<(), Report> {
  let mut parent_nuc_muts = BTreeMap::<usize, Nuc>::new();
  let mut parent_aa_muts = BTreeMap::<String, BTreeMap<usize, Aa>>::new();
  let mut id = 0_usize;
  tree_preprocess_in_place_impl_recursive(
    &mut id,
    &mut tree.tree,
    &mut parent_nuc_muts,
    &mut parent_aa_muts,
    ref_seq,
    ref_peptides,
  )?;

  // TODO: Avoid second full tree iteration by merging it into the one that is just above
  tree.tmp.max_divergence = get_max_divergence_recursively(&tree.tree);
  tree.tmp.divergence_units = DivergenceUnits::guess_from_max_divergence(tree.tmp.max_divergence);

  tree_add_metadata(tree);

  Ok(())
}

fn tree_preprocess_in_place_impl_recursive(
  id: &mut usize,
  node: &mut AuspiceTreeNode,
  parent_nuc_muts: &mut BTreeMap<usize, Nuc>,
  parent_aa_muts: &mut BTreeMap<String, BTreeMap<usize, Aa>>,
  ref_seq: &[Nuc],
  ref_peptides: &BTreeMap<String, Translation>,
) -> Result<(), Report> {
  let mut nuc_muts: BTreeMap<usize, Nuc> = map_nuc_muts(node, ref_seq, parent_nuc_muts);
  let nuc_subs: BTreeMap<usize, Nuc> = nuc_muts.clone().into_iter().filter(|(_, nuc)| !nuc.is_gap()).collect();

  let mut aa_muts: BTreeMap<String, BTreeMap<usize, Aa>> = map_aa_muts(node, ref_peptides, parent_aa_muts);
  let aa_subs: BTreeMap<String, BTreeMap<usize, Aa>> = aa_muts
    .clone()
    .into_iter()
    .map(|(gene, aa_muts)| (gene, aa_muts.into_iter().filter(|(_, aa)| !aa.is_gap()).collect()))
    .collect();

  node.tmp.id = *id;
  node.tmp.mutations = nuc_muts.clone();
  node.tmp.substitutions = nuc_subs;
  node.tmp.aa_mutations = aa_muts.clone();
  node.tmp.aa_substitutions = aa_subs;
  node.tmp.is_ref_node = true;

  node.node_attrs.node_type = Some(TreeNodeAttr::new("Reference"));

  for child in &mut node.children {
    *id += 1;
    tree_preprocess_in_place_impl_recursive(id, child, &mut nuc_muts, &mut aa_muts, ref_seq, ref_peptides)?;
  }

  Ok(())
}

fn map_nuc_muts(
  node: &AuspiceTreeNode,
  ref_seq: &[Nuc],
  parent_nuc_muts: &BTreeMap<usize, Nuc>,
) -> BTreeMap<usize, Nuc> {
  let mut nuc_muts = parent_nuc_muts.clone();
  match node.branch_attrs.mutations.get("nuc") {
    None => nuc_muts,
    Some(mutations) => {
      for mutation_str in mutations {
        let mutation = NucSub::from_str(mutation_str).unwrap();
        // If mutation reverts nucleotide back to what reference had, remove it from the map
        let ref_nuc = ref_seq[mutation.pos];
        if ref_nuc == mutation.qry {
          nuc_muts.remove(&mutation.pos);
        } else {
          nuc_muts.insert(mutation.pos, mutation.qry);
        }
      }
      nuc_muts
    }
  }
}

fn map_aa_muts(
  node: &AuspiceTreeNode,
  ref_peptides: &BTreeMap<String, Translation>,
  parent_aa_muts: &BTreeMap<String, BTreeMap<usize, Aa>>,
) -> BTreeMap<String, BTreeMap<usize, Aa>> {
  node
    .branch_attrs
    .mutations
    .iter()
    .filter_map(
      // -> Option<(String, Result<BTreeMap<usize, Aa>, Report>)>
      |(gene_name, mut_strs)| {
        let ref_peptide = ref_peptides.get(gene_name);
        let aa_muts = parent_aa_muts.get(gene_name);
        match (ref_peptide, aa_muts) {
          (Some(ref_peptide), Some(aa_muts)) => {
            let aa_mut_map = map_aa_muts_for_one_gene(node, &ref_peptide.seq, aa_muts);
            Some((gene_name.clone(), aa_mut_map))
          }
          _ => None,
        }
      },
    )
    .collect()
}

fn map_aa_muts_for_one_gene(
  node: &AuspiceTreeNode,
  ref_peptide: &[Aa],
  parent_aa_muts: &BTreeMap<usize, Aa>,
) -> BTreeMap<usize, Aa> {
  let mut aa_muts = parent_aa_muts.clone();

  match node.branch_attrs.mutations.get("nuc") {
    None => aa_muts,
    Some(mutations) => {
      for mutation_str in mutations {
        let mutation = AaSubMinimal::from_str(mutation_str).unwrap();
        // If mutation reverts nucleotide back to what reference had, remove it from the map
        let ref_nuc = ref_peptide[mutation.pos];
        if ref_nuc == mutation.qry {
          aa_muts.remove(&mutation.pos);
        } else {
          aa_muts.insert(mutation.pos, mutation.qry);
        }
      }
      aa_muts
    }
  }
}

fn get_max_divergence_recursively(node: &AuspiceTreeNode) -> f64 {
  let div = node.node_attrs.div.unwrap_or(-f64::infinity());

  let mut child_div = -f64::infinity();
  node.children.iter().for_each(|child| {
    if let Some(div) = child.node_attrs.div {
      child_div = child_div.max(div);
    }
  });

  div.max(child_div)
}

fn pair(key: &str, val: &str) -> [String; 2] {
  [key.to_owned(), val.to_owned()]
}

fn tree_add_metadata(tree: &mut AuspiceTree) {
  let new_colorings: Vec<AuspiceColoring> = vec![
    AuspiceColoring {
      key: "Node type".to_owned(),
      title: "Node type".to_owned(),
      type_: "categorical".to_owned(),
      scale: vec![pair("New", "#ff6961"), pair("Reference", "#999999")],
    },
    AuspiceColoring {
      key: "QC Status".to_owned(),
      title: "QC Status".to_owned(),
      type_: "categorical".to_owned(),
      scale: vec![
        pair("good", "#417C52"),
        pair("mediocre", "#cab44d"),
        pair("bad", "#CA738E"),
      ],
    },
    AuspiceColoring {
      key: "Has PCR primer changes".to_owned(),
      title: "Has PCR primer changes".to_owned(),
      type_: "categorical".to_owned(),
      scale: vec![pair("Yes", "#6961ff"), pair("No", "#999999")],
    },
  ];

  tree.meta.colorings = concat_to_vec(&new_colorings, &tree.meta.colorings);

  tree.meta.colorings.iter_mut().for_each(|coloring| {
    let key: &str = &coloring.key;
    match key {
      "region" | "country" | "division" => {
        coloring.scale = concat_to_vec(&[pair(AUSPICE_UNKNOWN_VALUE, "#999999")], &coloring.scale);
      }
      _ => {}
    }
  });

  tree.meta.display_defaults.branch_label = Some("clade".to_owned());
  tree.meta.display_defaults.color_by = Some("clade_membership".to_owned());
  tree.meta.display_defaults.distance_measure = Some("div".to_owned());

  tree.meta.panels = vec!["tree".to_owned(), "entropy".to_owned()];

  let new_filters = vec![
    "clade_membership".to_owned(),
    "Node type".to_owned(),
    "QC Status".to_owned(),
    "Has PCR primer changes".to_owned(),
  ];

  tree.meta.filters = concat_to_vec(&new_filters, &tree.meta.filters);

  tree.meta.geo_resolutions = serde_json::Value::Null;
}
