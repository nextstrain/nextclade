use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use crate::align::seed_match2::CodonSpacedIndex;
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
use crate::make_error;
use crate::run::nextclade_run_one::nextclade_run_one;
use crate::run::params::{NextcladeInputParams, NextcladeInputParamsOptional};
use crate::translate::translate_genes::Translation;
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::tree::{AuspiceGraph, AuspiceTree, CladeNodeAttrKeyDesc};
use crate::tree::tree_builder::graph_attach_new_nodes_in_place;
use crate::tree::tree_preprocess::graph_preprocess_in_place;
use crate::types::outputs::NextcladeOutputs;
use eyre::{Report, WrapErr};
use log::info;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParams {
  #[schemars(with = "String")]
  pub ref_record: FastaRecord,
  pub gene_map: Option<GeneMap>,
  pub tree: Option<AuspiceTree>,
  pub virus_properties: VirusProperties,
}

impl NextcladeParams {
  pub fn from_raw(raw: &NextcladeParamsRaw) -> Result<Self, Report> {
    let ref_record = read_one_fasta_str(&raw.ref_seq).wrap_err("When parsing reference sequence")?;

    let tree = raw
      .tree
      .map(|tree| AuspiceTree::from_str(&tree).wrap_err("When parsing reference tree Auspice JSON v2"))
      .transpose()?;

    let gene_map = raw
      .gene_map
      .map(|gene_map| GeneMap::from_str(&gene_map).wrap_err("When parsing genome annotation"))
      .transpose()?;

    let virus_properties = raw
      .virus_properties
      .map(|virus_properties| {
        VirusProperties::from_str(&virus_properties).wrap_err("When parsing virus properties JSON")
      })
      .transpose()?
      .unwrap_or_default();

    match (&gene_map, &tree) {
      (None, None) => {
        info!("Running Nextclade with tier 0 data: only reference sequence is provided.")
      }
      (Some(gene_map), None) => {
        info!("Running Nextclade with tier 1 data: reference sequence and genome annotation are provided.")
      }
      (Some(gene_map), Some(tree)) => {
        info!(
          "Running Nextclade with tier 2 data: reference sequence, genome annotation and reference tree are provided."
        )
      }
      (None, Some(tree)) => {
        return make_error!("Incorrect input files: when reference tree is provided, genome annotation must also be provided, but not found. This might be a problem with your dataset and/or with how arguments in Nextclade CLI are provided or with how dataset file customization is used in Nextclade Web. Please refer to documentation. Contact dataset authors, if applicable.")
      }
    }

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
  pub qc_config: Option<String>,
  pub virus_properties: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisInput {
  pub qry_index: usize,
  pub qry_seq_name: String,
  pub qry_seq_str: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisInitialData {
  genome_size: usize,
  gene_map: Option<GeneMap>,
  clade_node_attr_key_descs: Vec<CladeNodeAttrKeyDesc>,
  phenotype_attr_descs: Vec<PhenotypeAttrDesc>,
  aa_motifs_descs: Vec<AaMotifsDesc>,
  csv_column_config_default: CsvColumnConfig,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisOutput {
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
  pub tier0: NextcladeStateTier0,
  pub tier1: Option<NextcladeStateTier1>,
  pub tier2: Option<NextcladeStateTier2>,
}

pub struct NextcladeStateTier0 {
  pub ref_record: FastaRecord,
  pub ref_seq: Vec<Nuc>,
  pub seed_index: CodonSpacedIndex,
  pub gap_open_close_nuc: Vec<i32>,
  pub virus_properties: VirusProperties,
  pub params: NextcladeInputParams,
}

pub struct NextcladeStateTier1 {
  pub gene_map: GeneMap,
  pub gap_open_close_nuc: Vec<i32>,
  pub gap_open_close_aa: Vec<i32>,
  pub ref_translation: Translation,
  pub aa_motifs_ref: AaMotifsMap,
  pub aa_motifs_descs: Vec<AaMotifsDesc>,
}

pub struct NextcladeStateTier2 {
  pub graph: AuspiceGraph,
  pub clade_node_attrs: Vec<CladeNodeAttrKeyDesc>,
  pub phenotype_attr_descs: Vec<PhenotypeAttrDesc>,
}

fn init_tier_0(
  ref_record: FastaRecord,
  virus_properties: VirusProperties,
  params: &NextcladeInputParamsOptional,
) -> Result<NextcladeStateTier0, Report> {
  let params = NextcladeInputParams::from_optional(params, &virus_properties);

  let ref_seq = to_nuc_seq(&ref_record.seq).wrap_err("When converting reference sequence")?;
  let seed_index = CodonSpacedIndex::from_sequence(&ref_seq);
  let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &GeneMap::new(), &params.alignment);

  Ok(NextcladeStateTier0 {
    ref_record,
    ref_seq,
    seed_index,
    gap_open_close_nuc,
    virus_properties,
    params,
  })
}

fn init_tier_1(gene_map: GeneMap, t0: &NextcladeStateTier0) -> Result<NextcladeStateTier1, Report> {
  let NextcladeStateTier0 {
    ref_seq,
    virus_properties,
    params,
    ..
  } = t0;

  let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params.alignment);
  let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &params.alignment);

  let ref_translation =
    translate_genes_ref(&ref_seq, &gene_map, &params.alignment).wrap_err("When translating reference sequence")?;

  let aa_motifs_ref = find_aa_motifs(&virus_properties.aa_motifs, &ref_translation)
    .wrap_err("When searching AA motifs in reference translation")?;
  let aa_motifs_descs = virus_properties.aa_motifs.clone();

  Ok(NextcladeStateTier1 {
    gene_map,
    gap_open_close_nuc,
    gap_open_close_aa,
    ref_translation,
    aa_motifs_ref,
    aa_motifs_descs,
  })
}

fn init_tier_2(
  tree: AuspiceTree,
  t0: &NextcladeStateTier0,
  t1: &NextcladeStateTier1,
) -> Result<NextcladeStateTier2, Report> {
  let NextcladeStateTier0 {
    ref_seq,
    virus_properties,
    ..
  } = t0;

  let NextcladeStateTier1 { ref_translation, .. } = t1;

  let mut graph = convert_auspice_tree_to_graph(tree).wrap_err("When converting Auspice tree to Nextclade graph")?;
  graph_preprocess_in_place(&mut graph, &ref_seq, &ref_translation).wrap_err("When preprocessing Nextclade graph")?;

  let clade_node_attrs = graph.data.meta.clade_node_attr_descs().to_vec();
  let phenotype_attr_descs = get_phenotype_attr_descs(&virus_properties);

  Ok(NextcladeStateTier2 {
    graph,
    clade_node_attrs,
    phenotype_attr_descs,
  })
}

impl Nextclade {
  pub fn new(inputs: NextcladeParams, params: &NextcladeInputParamsOptional) -> Result<Self, Report> {
    let NextcladeParams {
      ref_record,
      gene_map,
      tree,
      virus_properties,
    } = inputs;

    let tier0 = init_tier_0(ref_record, virus_properties, params)?;
    // if let Some(gene_map) = gene_map {
    //   let t1 = init_tier_1(gene_map, &t0)?;
    //   if let Some(tree) = tree {
    //     let t2 = init_tier_2(tree, &t0, &t1)?;
    //     return Ok(Self::Tier2(t0, t1, t2));
    //   }
    //   return Ok(Self::Tier1(t0, t1));
    // }
    // return Ok(Self::Tier0(t0));

    let tier1 = gene_map.map(|gene_map| init_tier_1(gene_map, &tier0)).transpose()?;

    let tier2 = if let (Some(tree), Some(tier1)) = (tree, &tier1) {
      Some(init_tier_2(tree, &tier0, tier1)?)
    } else {
      None
    };

    Ok(Self { tier0, tier1, tier2 })
  }

  pub fn get_initial_data(&self) -> Result<AnalysisInitialData, Report> {
    Ok(AnalysisInitialData {
      gene_map: self.tier1.map(|tier1| tier1.gene_map.clone()),
      genome_size: self.tier0.ref_seq.len(),
      clade_node_attr_key_descs: self
        .tier2
        .map(|tier2| tier2.clade_node_attrs.clone())
        .unwrap_or_default(),
      phenotype_attr_descs: self
        .tier2
        .map(|tier2| tier2.phenotype_attr_descs.clone())
        .unwrap_or_default(),
      aa_motifs_descs: self
        .tier1
        .map(|tier1| tier1.aa_motifs_descs.clone())
        .unwrap_or_default(),
      csv_column_config_default: CsvColumnConfig::default(),
    })
  }

  pub fn run(&self, input: &FastaRecord) -> Result<AnalysisOutput, Report> {
    if self.tier0.params.general.replace_unknown {
      Ok(to_nuc_seq_replacing(&input.seq))
    } else {
      to_nuc_seq(&input.seq)
    }
    .and_then(|qry_seq| nextclade_run_one(input.index, &input.seq_name, &qry_seq, &self))
  }

  pub fn get_output_trees(&mut self, results: Vec<NextcladeOutputs>) -> Result<OutputTrees, Report> {
    graph_attach_new_nodes_in_place(&mut self.graph, results, self.ref_seq.len(), &self.params.tree_builder)?;
    let auspice = convert_graph_to_auspice_tree(&self.graph)?;
    let nwk = convert_graph_to_nwk_string(&self.graph)?;
    Ok(OutputTrees { auspice, nwk })
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct OutputTrees {
  auspice: AuspiceTree,
  nwk: String,
}
