use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_private_nuc_mutations::PrivateMutationsMinimal;
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition, PositionLike};
use crate::graph::node::GraphNodeKey;
use crate::make_error;
use crate::translate::translate_genes::Translation;
use crate::tree::tree::{
  AuspiceColoring, AuspiceGraph, AuspiceTreeMeta, AuspiceTreeNode, TreeNodeAttr, AUSPICE_UNKNOWN_VALUE,
};
use crate::utils::collections::concat_to_vec;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use maplit::btreemap;
use std::collections::BTreeMap;
use std::str::FromStr;

pub fn graph_preprocess_in_place(
  graph: &mut AuspiceGraph,
  ref_seq: &[Nuc],
  ref_translation: &Translation,
) -> Result<(), Report> {
  let mut parent_nuc_muts = BTreeMap::<NucRefGlobalPosition, Nuc>::new();
  let mut parent_aa_muts = BTreeMap::<String, BTreeMap<AaRefPosition, Aa>>::new();

  let root_key = graph.get_exactly_one_root()?.key();
  graph_preprocess_in_place_recursive(
    graph,
    root_key,
    &mut parent_nuc_muts,
    &mut parent_aa_muts,
    ref_seq,
    ref_translation,
  )?;

  Ok(())
}

pub fn graph_preprocess_in_place_recursive(
  graph: &mut AuspiceGraph,
  graph_node_key: GraphNodeKey,
  parent_nuc_muts: &mut BTreeMap<NucRefGlobalPosition, Nuc>,
  parent_aa_muts: &mut BTreeMap<String, BTreeMap<AaRefPosition, Aa>>,
  ref_seq: &[Nuc],
  ref_translation: &Translation,
) -> Result<GraphNodeKey, Report> {
  let (mut nuc_muts, mut aa_muts) = {
    let node = graph.get_node_mut(graph_node_key)?.payload_mut();

    let nuc_muts: BTreeMap<NucRefGlobalPosition, Nuc> = map_nuc_muts(node, ref_seq, parent_nuc_muts)?;
    let nuc_subs: BTreeMap<NucRefGlobalPosition, Nuc> =
      nuc_muts.clone().into_iter().filter(|(_, nuc)| !nuc.is_gap()).collect();

    let aa_muts: BTreeMap<String, BTreeMap<AaRefPosition, Aa>> = map_aa_muts(node, ref_translation, parent_aa_muts)?;
    let aa_subs: BTreeMap<String, BTreeMap<AaRefPosition, Aa>> = aa_muts
      .clone()
      .into_iter()
      .map(|(gene, aa_muts)| (gene, aa_muts.into_iter().filter(|(_, aa)| !aa.is_gap()).collect()))
      .collect();

    node.tmp.mutations = nuc_muts.clone();
    node.tmp.private_mutations = calc_node_private_mutations(node)?;
    node.tmp.substitutions = nuc_subs;
    node.tmp.aa_mutations = aa_muts.clone();
    node.tmp.aa_substitutions = aa_subs;
    node.tmp.is_ref_node = true;
    node.tmp.id = graph_node_key;

    node.node_attrs.node_type = Some(TreeNodeAttr::new("Reference"));

    (nuc_muts, aa_muts)
  };

  for child_key in graph.iter_child_keys_of_by_key(graph_node_key).collect_vec() {
    graph_preprocess_in_place_recursive(graph, child_key, &mut nuc_muts, &mut aa_muts, ref_seq, ref_translation)?;
  }

  Ok(graph_node_key)
}

pub fn calc_node_private_mutations(node: &AuspiceTreeNode) -> Result<PrivateMutationsMinimal, Report> {
  let mut nuc_sub = Vec::<NucSub>::new();
  let mut nuc_del = Vec::<NucDel>::new();
  let mut aa_sub = BTreeMap::<String, Vec<AaSub>>::new();
  match node.branch_attrs.mutations.get("nuc") {
    None => Ok(PrivateMutationsMinimal {
      nuc_subs: nuc_sub,
      nuc_dels: nuc_del,
      aa_muts: aa_sub,
    }),
    Some(mutations) => {
      for mutation_str in mutations {
        let mutation = NucSub::from_str(mutation_str)?;
        if mutation.is_del() {
          let del = NucDel {
            ref_nuc: mutation.ref_nuc,
            pos: mutation.pos,
          };
          nuc_del.push(del);
        } else {
          nuc_sub.push(mutation);
        }
      }
      for (gene, muts) in &node.branch_attrs.mutations {
        if gene != "nuc" {
          let mut aa_sub_vec = Vec::<AaSub>::new();
          for mutation_str in muts {
            let mutation = AaSub::from_str(&format!("{gene}:{mutation_str}"))?;
            aa_sub_vec.push(mutation);
          }
          aa_sub.insert(gene.to_string(), aa_sub_vec);
        }
      }
      Ok(PrivateMutationsMinimal {
        nuc_subs: nuc_sub,
        nuc_dels: nuc_del,
        aa_muts: aa_sub,
      })
    }
  }
}

fn map_nuc_muts(
  node: &AuspiceTreeNode,
  ref_seq: &[Nuc],
  parent_nuc_muts: &BTreeMap<NucRefGlobalPosition, Nuc>,
) -> Result<BTreeMap<NucRefGlobalPosition, Nuc>, Report> {
  let mut nuc_muts = parent_nuc_muts.clone();
  match node.branch_attrs.mutations.get("nuc") {
    None => Ok(nuc_muts),
    Some(mutations) => {
      for mutation_str in mutations {
        let mutation = NucSub::from_str(mutation_str)
          .wrap_err_with(|| format!("When parsing nucleotide mutation {mutation_str}"))?;

        if ref_seq.len() < mutation.pos.as_usize() {
          return make_error!(
            "Encountered a mutation ({mutation_str}) in reference tree branch attributes, for which the position is outside of reference sequence length ({}). This is likely an inconsistency between reference tree and reference sequence in the Nextclade dataset. Check that you are using a correct dataset.", ref_seq.len()
          );
        }

        // If mutation reverts nucleotide back to what reference had, remove it from the map
        let ref_nuc = ref_seq[mutation.pos.as_usize()];
        if ref_nuc == mutation.qry_nuc {
          nuc_muts.remove(&mutation.pos);
        } else {
          nuc_muts.insert(mutation.pos, mutation.qry_nuc);
        }
      }
      Ok(nuc_muts)
    }
  }
}

/// Takes a node, and adds that nodes aa mutations to the mutations from the parent
/// This function is necessary as there are many genes
// TODO: Treat "nuc" just as another gene, thus reduce duplicate
fn map_aa_muts(
  node: &AuspiceTreeNode,
  ref_translation: &Translation,
  parent_aa_muts: &BTreeMap<String, BTreeMap<AaRefPosition, Aa>>,
) -> Result<BTreeMap<String, BTreeMap<AaRefPosition, Aa>>, Report> {
  ref_translation
    .cdses()
    //We iterate over all genes that we have ref_peptides for
    .map(|ref_cds_tr| {
      let empty = btreemap! {};
      let aa_muts = parent_aa_muts.get(&ref_cds_tr.name).unwrap_or(&empty);
      (
        ref_cds_tr.name.clone(),
        map_aa_muts_for_one_gene(&ref_cds_tr.name, node, &ref_cds_tr.seq, aa_muts),
      )
    })
    .map(|(name, muts)| -> Result<_, Report>  {
      Ok((name, muts?))
    })
    .collect()
}

fn map_aa_muts_for_one_gene(
  gene_name: &str,
  node: &AuspiceTreeNode,
  ref_peptide: &[Aa],
  parent_aa_muts: &BTreeMap<AaRefPosition, Aa>,
) -> Result<BTreeMap<AaRefPosition, Aa>, Report> {
  let mut aa_muts = parent_aa_muts.clone();

  match node.branch_attrs.mutations.get(gene_name) {
    None => Ok(aa_muts),
    Some(mutations) => {
      for mutation_str in mutations {
        let mutation = AaSub::from_str_and_gene(mutation_str, gene_name)?;

        if ref_peptide.len() < mutation.pos.as_usize() {
          return make_error!(
          "When preprocessing reference tree node {}: amino acid mutation {}:{} is outside of the peptide {} (length {}). This is likely an inconsistency between reference tree, reference sequence, and gene map in the Nextclade dataset",
          node.name,
          gene_name,
          mutation.to_string_without_gene(),
          gene_name,
          ref_peptide.len(),
        );
        }

        // If mutation reverts amino acid back to what reference had, remove it from the map
        let ref_aa = ref_peptide[mutation.pos.as_usize()];
        if ref_aa == mutation.qry_aa {
          aa_muts.remove(&mutation.pos);
        } else {
          aa_muts.insert(mutation.pos, mutation.qry_aa);
        }
      }
      Ok(aa_muts)
    }
  }
}

fn pair(key: &str, val: &str) -> [String; 2] {
  [key.to_owned(), val.to_owned()]
}

pub fn add_auspice_metadata_in_place(meta: &mut AuspiceTreeMeta) {
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

  meta.colorings = concat_to_vec(&new_colorings, &meta.colorings);

  meta.colorings.iter_mut().for_each(|coloring| {
    let key: &str = &coloring.key;
    match key {
      "region" | "country" | "division" => {
        coloring.scale = concat_to_vec(&[pair(AUSPICE_UNKNOWN_VALUE, "#999999")], &coloring.scale);
      }
      _ => {}
    }
  });

  meta.display_defaults.branch_label = Some("clade".to_owned());
  meta.display_defaults.color_by = Some("clade_membership".to_owned());
  meta.display_defaults.distance_measure = Some("div".to_owned());

  meta.panels = vec!["tree".to_owned(), "entropy".to_owned()];

  let new_filters = vec![
    "clade_membership".to_owned(),
    "Node type".to_owned(),
    "QC Status".to_owned(),
    "Has PCR primer changes".to_owned(),
  ];

  meta.filters = concat_to_vec(&new_filters, &meta.filters);

  meta.geo_resolutions = None;
}
