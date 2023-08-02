use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use crate::align::params::AlignPairwiseParams;
use crate::align::seed_match2::CodonSpacedIndex;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::alphabet::nuc::{to_nuc_seq, Nuc};
use crate::analyze::find_aa_motifs::find_aa_motifs;
use crate::analyze::find_aa_motifs_changes::AaMotifsMap;
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::phenotype::get_phenotype_attr_descs;
use crate::analyze::virus_properties::{AaMotifsDesc, PhenotypeAttrDesc, VirusProperties};
use crate::gene::gene_map::GeneMap;
use crate::graph::graph::{convert_auspice_tree_to_graph, convert_graph_to_auspice_tree};
use crate::io::fasta::{read_one_fasta_str, FastaRecord};
use crate::io::nextclade_csv::CsvColumnConfig;
use crate::io::nwk_writer::convert_graph_to_nwk_string;
use crate::qc::qc_config::QcConfig;
use crate::run::nextclade_run_one::nextclade_run_one;
use crate::translate::translate_genes::Translation;
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::params::TreeBuilderParams;
use crate::tree::tree::{AuspiceGraph, AuspiceTree, CladeNodeAttrKeyDesc};
use crate::tree::tree_builder::graph_attach_new_nodes_in_place;
use crate::tree::tree_preprocess::graph_preprocess_in_place;
use crate::types::outputs::NextcladeOutputs;
use crate::utils::error::report_to_string;
use eyre::{Report, WrapErr};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParams {
  #[schemars(with = "String")]
  pub ref_seq: Vec<Nuc>,
  pub gene_map: GeneMap,
  pub tree: AuspiceTree,
  pub qc_config: QcConfig,
  pub virus_properties: VirusProperties,
}

impl NextcladeParams {
  pub fn from_raw(raw: &NextcladeParamsRaw) -> Result<Self, Report> {
    let ref_seq = {
      let ref_record = read_one_fasta_str(&raw.ref_seq).wrap_err("When parsing reference sequence")?;
      to_nuc_seq(&ref_record.seq).wrap_err("When converting reference sequence")?
    };
    let tree = AuspiceTree::from_str(&raw.tree).wrap_err("When parsing reference tree Auspice JSON v2")?;
    let gene_map = GeneMap::from_str(&raw.gene_map).wrap_err("When parsing gene map")?;
    let qc_config = QcConfig::from_str(&raw.qc_config).wrap_err("When parsing QC config JSON")?;
    let virus_properties =
      VirusProperties::from_str(&raw.virus_properties).wrap_err("When parsing virus properties JSON")?;

    Ok(Self {
      ref_seq,
      gene_map,
      tree,
      qc_config,
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
  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  query: Vec<Nuc>,
  translation: Translation,
  analysis_result: NextcladeOutputs,
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
  ref_seq: Vec<Nuc>,
  seed_index: CodonSpacedIndex,
  ref_translation: Translation,
  aa_motifs_ref: AaMotifsMap,
  gene_map: GeneMap,
  primers: Vec<PcrPrimer>,
  graph: AuspiceGraph,
  qc_config: QcConfig,
  virus_properties: VirusProperties,
  gap_open_close_nuc: Vec<i32>,
  gap_open_close_aa: Vec<i32>,
  clade_node_attrs: Vec<CladeNodeAttrKeyDesc>,
  phenotype_attr_descs: Vec<PhenotypeAttrDesc>,
  aa_motifs_descs: Vec<AaMotifsDesc>,
  alignment_params: AlignPairwiseParams,
  tree_builder_params: TreeBuilderParams,
  include_nearest_node_info: bool,
}

impl Nextclade {
  pub fn new(params: NextcladeParams) -> Result<Self, Report> {
    let NextcladeParams {
      ref_seq,
      gene_map,
      tree,
      qc_config,
      virus_properties,
    } = params;

    let seed_index = CodonSpacedIndex::from_sequence(&ref_seq);

    let alignment_params = {
      let mut alignment_params = AlignPairwiseParams::default();
      // Merge alignment params coming from virus_properties into alignment_params
      if let Some(alignment_params_from_file) = &virus_properties.alignment_params {
        alignment_params.merge_opt(alignment_params_from_file.clone());
      }
      alignment_params
    };

    let tree_builder_params = {
      let mut tree_builder_params = TreeBuilderParams::default();
      // Merge alignment params coming from virus_properties into alignment_params
      if let Some(tree_builder_params_from_file) = &virus_properties.tree_builder_params {
        tree_builder_params.merge_opt(tree_builder_params_from_file.clone());
      }
      tree_builder_params
    };

    let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &alignment_params);

    let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &alignment_params);

    let ref_translation =
      translate_genes_ref(&ref_seq, &gene_map, &alignment_params).wrap_err("When translating reference genes")?;

    let aa_motifs_ref = find_aa_motifs(&virus_properties.aa_motifs, &ref_translation)?;

    let mut graph = convert_auspice_tree_to_graph(tree)?;
    graph_preprocess_in_place(&mut graph, &ref_seq, &ref_translation)?;
    let clade_node_attrs = graph.data.meta.clade_node_attr_descs().to_vec();

    let phenotype_attr_descs = get_phenotype_attr_descs(&virus_properties);

    let aa_motifs_descs = virus_properties.aa_motifs.clone();

    Ok(Self {
      ref_seq,
      seed_index,
      ref_translation,
      aa_motifs_ref,
      gene_map,
      primers: vec![], // FIXME
      graph,
      qc_config,
      virus_properties,
      gap_open_close_nuc,
      gap_open_close_aa,
      clade_node_attrs,
      phenotype_attr_descs,
      aa_motifs_descs,
      alignment_params,
      tree_builder_params,
      include_nearest_node_info: false, // Never emit nearest node info in web, to reduce output size
    })
  }

  #[inline]
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

  pub fn run(&mut self, input: &FastaRecord) -> Result<NextcladeResult, Report> {
    let qry_seq = to_nuc_seq(&input.seq).wrap_err("When converting query sequence")?;

    match nextclade_run_one(
      input.index,
      &input.seq_name,
      &qry_seq,
      &self.ref_seq,
      &self.seed_index,
      &self.ref_translation,
      &self.aa_motifs_ref,
      &self.gene_map,
      &self.primers,
      &self.graph,
      &self.qc_config,
      &self.virus_properties,
      &self.gap_open_close_nuc,
      &self.gap_open_close_aa,
      &self.alignment_params,
      self.include_nearest_node_info,
    ) {
      Ok((query, translation, analysis_result)) => Ok(NextcladeResult {
        index: input.index,
        seq_name: input.seq_name.clone(),
        result: Some(AnalysisOutput {
          query,
          translation,
          analysis_result,
        }),
        error: None,
      }),
      Err(err) => {
        let error = report_to_string(&err);
        Ok(NextcladeResult {
          index: input.index,
          seq_name: input.seq_name.clone(),
          result: None,
          error: Some(error),
        })
      }
    }
  }

  pub fn get_output_trees(&mut self, results: Vec<NextcladeOutputs>) -> Result<OutputTrees, Report> {
    graph_attach_new_nodes_in_place(&mut self.graph, results, self.ref_seq.len(), &self.tree_builder_params)?;
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
