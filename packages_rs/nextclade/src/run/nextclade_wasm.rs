use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat, GapScoreMap};
use crate::align::seed_match2::CodonSpacedIndex;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::alphabet::nuc::{to_nuc_seq, to_nuc_seq_replacing, Nuc};
use crate::analyze::find_aa_motifs::find_aa_motifs;
use crate::analyze::find_aa_motifs_changes::AaMotifsMap;
use crate::analyze::phenotype::get_phenotype_attr_descs;
use crate::analyze::virus_properties::{AaMotifsDesc, PhenotypeAttrDesc, VirusProperties};
use crate::gene::gene_map::GeneMap;
use crate::graph::graph::{convert_auspice_tree_to_graph, convert_graph_to_auspice_tree};
use crate::io::fasta::{read_one_fasta_str, FastaRecord};
use crate::io::nextclade_csv::CsvColumnConfig;
use crate::io::nwk_writer::convert_graph_to_nwk_string;
use crate::run::nextclade_run_one::nextclade_run_one;
use crate::run::params::{NextcladeInputParams, NextcladeInputParamsOptional};
use crate::translate::translate_genes::Translation;
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::tree::{AuspiceGraph, AuspiceTree, CladeNodeAttrKeyDesc};
use crate::tree::tree_builder::graph_attach_new_nodes_in_place;
use crate::tree::tree_preprocess::graph_preprocess_in_place;
use crate::types::outputs::NextcladeOutputs;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::str::FromStr;

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParams {
  #[schemars(with = "String")]
  pub ref_record: FastaRecord,
  pub gene_map: GeneMap,
  pub tree: Option<AuspiceTree>,
  pub virus_properties: VirusProperties,
}

impl NextcladeParams {
  pub fn from_raw(raw: NextcladeParamsRaw) -> Result<Self, Report> {
    let virus_properties =
      VirusProperties::from_str(&raw.virus_properties).wrap_err("When parsing pathogen JSON")?;

    let ref_record = read_one_fasta_str(&raw.ref_seq).wrap_err("When parsing reference sequence")?;

    let tree = raw
      .tree
      .map(|tree| AuspiceTree::from_str(tree).wrap_err("When parsing reference tree Auspice JSON v2"))
      .transpose()?;

    let gene_map = raw.gene_map.map_or_else(
      || Ok(GeneMap::new()), // If genome annotation is not provided, use an empty one
      |gene_map| GeneMap::from_str(gene_map).wrap_err("When parsing genome annotation"),
    )?;

    Ok(Self {
      ref_record,
      gene_map,
      tree,
      virus_properties,
    })
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParamsRaw {
  #[schemars(with = "String")]
  pub ref_seq: String,
  pub gene_map: Option<String>,
  pub tree: Option<String>,
  pub virus_properties: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisInput {
  pub qry_index: usize,
  pub qry_seq_name: String,
  pub qry_seq_str: String,
}

#[derive(Clone, Debug, Serialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisInitialData<'a> {
  pub genome_size: usize,
  pub gene_map: GeneMap,
  pub clade_node_attr_key_descs: &'a [CladeNodeAttrKeyDesc],
  pub phenotype_attr_descs: &'a [PhenotypeAttrDesc],
  pub aa_motifs_descs: &'a [AaMotifsDesc],
  pub aa_motif_keys: &'a [String],
  pub csv_column_config_default: CsvColumnConfig,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisOutput {
  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub query: Vec<Nuc>,
  pub translation: Translation,
  pub analysis_result: NextcladeOutputs,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeResult {
  pub index: usize,
  pub seq_name: String,
  pub result: Option<AnalysisOutput>,
  pub error: Option<String>,
}

pub struct Nextclade {
  // Always present
  pub ref_record: FastaRecord,
  pub ref_seq: Vec<Nuc>,
  pub seed_index: CodonSpacedIndex,
  pub gap_open_close_nuc: Vec<i32>,
  pub virus_properties: VirusProperties,
  pub params: NextcladeInputParams,

  // If genome annotation is provided
  pub gene_map: GeneMap,
  pub gap_open_close_aa: Vec<i32>,
  pub ref_translation: Translation,
  pub aa_motifs_ref: AaMotifsMap,
  pub aa_motifs_descs: Vec<AaMotifsDesc>,
  pub aa_motifs_keys: Vec<String>,

  // If ref tree is provided
  pub graph: Option<AuspiceGraph>,
  pub clade_attr_descs: Vec<CladeNodeAttrKeyDesc>,
  pub phenotype_attr_descs: Vec<PhenotypeAttrDesc>,
}

pub struct InitialStateWithAa {
  pub gap_open_close_nuc: GapScoreMap,
  pub gap_open_close_aa: GapScoreMap,
  pub ref_translation: Translation,
  pub aa_motifs_ref: AaMotifsMap,
}

pub struct NextcladeStateWithGraph {
  pub graph: AuspiceGraph,
  pub clade_node_attrs: Vec<CladeNodeAttrKeyDesc>,
  pub phenotype_attr_descs: Vec<PhenotypeAttrDesc>,
}

impl Nextclade {
  pub fn new(inputs: NextcladeParams, params: &NextcladeInputParamsOptional) -> Result<Self, Report> {
    let NextcladeParams {
      ref_record,
      gene_map,
      tree,
      virus_properties,
    } = inputs;

    let params = NextcladeInputParams::from_optional(params, &virus_properties);
    let ref_seq = to_nuc_seq(&ref_record.seq).wrap_err("When converting reference sequence")?;
    let seed_index = CodonSpacedIndex::from_sequence(&ref_seq);

    // If genome annotation is present, calculate AA-related parameters
    let InitialStateWithAa {
      gap_open_close_nuc,
      gap_open_close_aa,
      ref_translation,
      aa_motifs_ref,
    } = if !gene_map.is_empty() {
      let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params.alignment);
      let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &params.alignment);

      let ref_translation =
        translate_genes_ref(&ref_seq, &gene_map, &params.alignment).wrap_err("When translating reference sequence")?;

      let aa_motifs_ref = find_aa_motifs(&virus_properties.aa_motifs, &ref_translation)
        .wrap_err("When searching AA motifs in reference translation")?;

      InitialStateWithAa {
        gap_open_close_nuc,
        gap_open_close_aa,
        ref_translation,
        aa_motifs_ref,
      }
    } else {
      let gap_open_close = get_gap_open_close_scores_flat(&ref_seq, &params.alignment);
      InitialStateWithAa {
        gap_open_close_nuc: gap_open_close.clone(),
        gap_open_close_aa: gap_open_close,
        ref_translation: Translation::default(),
        aa_motifs_ref: BTreeMap::default(),
      }
    };

    let graph = tree
      .map(|tree| -> Result<AuspiceGraph, Report> {
        let mut graph =
          convert_auspice_tree_to_graph(tree).wrap_err("When converting Auspice tree to Nextclade graph")?;

        graph_preprocess_in_place(&mut graph, &ref_seq, &ref_translation)
          .wrap_err("When preprocessing Nextclade graph")?;

        Ok(graph)
      })
      .transpose()?;

    let clade_attr_descs = graph
      .as_ref()
      .map(|graph| graph.data.meta.clade_node_attr_descs().to_vec())
      .unwrap_or_default();

    let phenotype_attr_descs = get_phenotype_attr_descs(&virus_properties);

    let aa_motifs_descs = virus_properties.aa_motifs.clone();
    let aa_motifs_keys = aa_motifs_descs.iter().map(|desc| desc.name.clone()).collect_vec();

    Ok(Self {
      ref_record,
      ref_seq,
      seed_index,
      gap_open_close_nuc,
      virus_properties,
      params,
      gene_map,
      gap_open_close_aa,
      ref_translation,
      aa_motifs_ref,
      aa_motifs_descs,
      aa_motifs_keys,
      graph,
      clade_attr_descs,
      phenotype_attr_descs,
    })
  }

  pub fn get_initial_data(&self) -> AnalysisInitialData {
    AnalysisInitialData {
      gene_map: self.gene_map.clone(),
      genome_size: self.ref_seq.len(),
      clade_node_attr_key_descs: &self.clade_attr_descs,
      phenotype_attr_descs: &self.phenotype_attr_descs,
      aa_motifs_descs: &self.aa_motifs_descs,
      aa_motif_keys: &self.aa_motifs_keys,
      csv_column_config_default: CsvColumnConfig::default(),
    }
  }

  pub fn run(&self, input: &FastaRecord) -> Result<AnalysisOutput, Report> {
    if self.params.general.replace_unknown {
      Ok(to_nuc_seq_replacing(&input.seq))
    } else {
      to_nuc_seq(&input.seq)
    }
    .and_then(|qry_seq| nextclade_run_one(input.index, &input.seq_name, &qry_seq, self))
  }

  pub fn get_output_trees(&mut self, results: Vec<NextcladeOutputs>) -> Result<Option<OutputTrees>, Report> {
    if let Some(graph) = &mut self.graph {
      graph_attach_new_nodes_in_place(graph, results, self.ref_seq.len(),  &self.params.tree_builder)?;
      let auspice = convert_graph_to_auspice_tree(graph)?;
      let nwk = convert_graph_to_nwk_string(graph)?;
      Ok(Some(OutputTrees { auspice, nwk }))
    } else {
      Ok(None)
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct OutputTrees {
  auspice: AuspiceTree,
  nwk: String,
}
