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
use crate::run::nextclade_run_one::nextclade_run_one;
use crate::run::params::{NextcladeInputParams, NextcladeInputParamsOptional};
use crate::translate::translate_genes::Translation;
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::tree::{AuspiceGraph, AuspiceTree, CladeNodeAttrKeyDesc};
use crate::tree::tree_builder::graph_attach_new_nodes_in_place;
use crate::tree::tree_preprocess::graph_preprocess_in_place;
use crate::types::outputs::NextcladeOutputs;
use eyre::{Report, WrapErr};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParams {
  #[schemars(with = "String")]
  pub ref_record: FastaRecord,
  pub gene_map: GeneMap,
  pub tree: AuspiceTree,
  pub virus_properties: VirusProperties,
}

impl NextcladeParams {
  pub fn from_raw(raw: &NextcladeParamsRaw) -> Result<Self, Report> {
    let ref_record = read_one_fasta_str(&raw.ref_seq).wrap_err("When parsing reference sequence")?;
    let tree = AuspiceTree::from_str(&raw.tree).wrap_err("When parsing reference tree Auspice JSON v2")?;
    let gene_map = GeneMap::from_str(&raw.gene_map).wrap_err("When parsing gene map")?;
    let virus_properties =
      VirusProperties::from_str(&raw.virus_properties).wrap_err("When parsing virus properties JSON")?;

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
  pub gene_map: String,
  pub tree: String,
  pub qc_config: String,
  pub virus_properties: String,
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
  gene_map: GeneMap,
  genome_size: usize,
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
  pub ref_record: FastaRecord,
  pub ref_seq: Vec<Nuc>,
  pub seed_index: CodonSpacedIndex,
  pub ref_translation: Translation,
  pub aa_motifs_ref: AaMotifsMap,
  pub gene_map: GeneMap,
  pub graph: AuspiceGraph,
  pub virus_properties: VirusProperties,
  pub gap_open_close_nuc: Vec<i32>,
  pub gap_open_close_aa: Vec<i32>,
  pub clade_node_attrs: Vec<CladeNodeAttrKeyDesc>,
  pub phenotype_attr_descs: Vec<PhenotypeAttrDesc>,
  pub aa_motifs_descs: Vec<AaMotifsDesc>,
  pub params: NextcladeInputParams,
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

    let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params.alignment);
    let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &params.alignment);

    let ref_translation =
      translate_genes_ref(&ref_seq, &gene_map, &params.alignment).wrap_err("When translating reference sequence")?;

    let aa_motifs_ref = find_aa_motifs(&virus_properties.aa_motifs, &ref_translation)
      .wrap_err("When searching AA motifs in reference translation")?;

    let mut graph = convert_auspice_tree_to_graph(tree).wrap_err("When converting Auspice tree to Nextclade graph")?;
    graph_preprocess_in_place(&mut graph, &ref_seq, &ref_translation).wrap_err("When preprocessing Nextclade graph")?;

    let clade_node_attrs = graph.data.meta.clade_node_attr_descs().to_vec();
    let phenotype_attr_descs = get_phenotype_attr_descs(&virus_properties);

    let aa_motifs_descs = virus_properties.aa_motifs.clone();

    Ok(Self {
      ref_record,
      ref_seq,
      seed_index,
      ref_translation,
      aa_motifs_ref,
      gene_map,
      graph,
      virus_properties,
      gap_open_close_nuc,
      gap_open_close_aa,
      clade_node_attrs,
      phenotype_attr_descs,
      aa_motifs_descs,
      params,
    })
  }

  pub fn get_initial_data(&self) -> Result<AnalysisInitialData, Report> {
    Ok(AnalysisInitialData {
      gene_map: self.gene_map.clone(),
      genome_size: self.ref_seq.len(),
      clade_node_attr_key_descs: self.clade_node_attrs.clone(),
      phenotype_attr_descs: self.phenotype_attr_descs.clone(),
      aa_motifs_descs: self.aa_motifs_descs.clone(),
      csv_column_config_default: CsvColumnConfig::default(),
    })
  }

  pub fn run(&self, input: &FastaRecord) -> Result<AnalysisOutput, Report> {
    if self.params.general.replace_unknown {
      Ok(to_nuc_seq_replacing(&input.seq))
    } else {
      to_nuc_seq(&input.seq)
    }
    .and_then(|qry_seq| {
      nextclade_run_one(
        input.index,
        &input.seq_name,
        &qry_seq,
        &self.ref_seq,
        &self.seed_index,
        &self.ref_translation,
        &self.aa_motifs_ref,
        &self.gene_map,
        &self.graph,
        &self.virus_properties,
        &self.gap_open_close_nuc,
        &self.gap_open_close_aa,
        &self.params,
      )
    })
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
