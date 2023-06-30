use crate::wasm::js_value::{deserialize_js_value, serialize_js_value};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::align::params::AlignPairwiseParams;
use nextclade::analyze::find_aa_motifs::find_aa_motifs;
use nextclade::analyze::find_aa_motifs_changes::AaMotifsMap;
use nextclade::analyze::pcr_primers::PcrPrimer;
use nextclade::analyze::phenotype::get_phenotype_attr_descs;
use nextclade::analyze::virus_properties::{AaMotifsDesc, PhenotypeAttrDesc, VirusProperties};
use nextclade::gene::gene::Gene;
use nextclade::io::fasta::read_one_fasta_str;
use nextclade::io::gene_map::GeneMap;
use nextclade::io::gff3::read_gff3_str;
use nextclade::io::json::json_stringify;
use nextclade::io::nextclade_csv::CsvColumnConfig;
use nextclade::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use nextclade::make_internal_report;
use nextclade::qc::qc_config::QcConfig;
use nextclade::run::nextclade_run_one::nextclade_run_one;
use nextclade::translate::aa_alignment_ranges::calculate_aa_alignment_range_in_place;
use nextclade::translate::translate_genes::TranslationMap;
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::tree::tree::{AuspiceTree, CladeNodeAttrKeyDesc};
use nextclade::tree::tree_attach_new_nodes::{tree_attach_new_nodes_in_place, tree_attach_new_nodes_in_place_subtree};
use nextclade::tree::tree_preprocess::tree_preprocess_in_place;
use nextclade::types::outputs::NextcladeOutputs;
use nextclade::utils::error::report_to_string;
use nextclade::utils::range::Range;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use typescript_definitions::TypescriptDefinition;
use wasm_bindgen::prelude::*;

// Plain old Javascript Objects (POJO) to ensure type safety in `JsValue` serialization.
// They are convenient to use in constructors of complex types.
#[wasm_bindgen]
#[wasm_bindgen(typescript_type = "NextcladeParamsPojo")]
extern "C" {
  pub type NextcladeParamsPojo;

  #[wasm_bindgen(typescript_type = "AnalysisInputPojo")]
  pub type AnalysisInputPojo;

  #[wasm_bindgen(typescript_type = "AnalysisInitialDataPojo")]
  pub type AnalysisInitialDataPojo;

  #[wasm_bindgen(typescript_type = "AnalysisOutputPojo")]
  pub type AnalysisOutputPojo;

  #[wasm_bindgen(typescript_type = "AnalysisResultPojo")]
  pub type AnalysisResultPojo;
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct NextcladeParams {
  #[wasm_bindgen(getter_with_clone)]
  pub ref_seq_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub gene_map_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub tree_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub qc_config_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub virus_properties_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub pcr_primers_str: String,
}

#[wasm_bindgen]
impl NextcladeParams {
  pub fn from_js(params: &NextcladeParamsPojo) -> Result<NextcladeParams, JsError> {
    deserialize_js_value::<NextcladeParams>(params)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct AnalysisInput {
  #[wasm_bindgen(getter_with_clone)]
  pub qry_index: usize,

  #[wasm_bindgen(getter_with_clone)]
  pub qry_seq_name: String,

  #[wasm_bindgen(getter_with_clone)]
  pub qry_seq_str: String,
}

#[wasm_bindgen]
impl AnalysisInput {
  pub fn from_js(input: &AnalysisInputPojo) -> Result<AnalysisInput, JsError> {
    deserialize_js_value::<AnalysisInput>(input)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
#[serde(rename = "camelCase")]
pub struct AnalysisInitialData {
  gene_map: String,
  genome_size: usize,
  clade_node_attr_key_descs: String,
  phenotype_attr_descs: String,
  aa_motifs_descs: String,
  csv_column_config_default: String,
}

#[wasm_bindgen]
impl AnalysisInitialData {
  pub fn to_js(&self) -> Result<AnalysisInitialDataPojo, JsError> {
    serialize_js_value::<AnalysisInitialData, AnalysisInitialDataPojo>(self)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
#[serde(rename = "camelCase")]
pub struct AnalysisOutput {
  analysis_result: String,
  query: String,
  query_peptides: String,
}

#[wasm_bindgen]
impl AnalysisOutput {
  pub fn to_js(&self) -> Result<AnalysisOutputPojo, JsError> {
    serialize_js_value::<AnalysisOutput, AnalysisOutputPojo>(self)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
#[serde(rename = "camelCase")]
pub struct AnalysisResult {
  result: Option<AnalysisOutput>,
  error: Option<String>,
}

#[wasm_bindgen]
impl AnalysisResult {
  pub fn to_js(&self) -> Result<AnalysisResultPojo, JsError> {
    serialize_js_value::<AnalysisResult, AnalysisResultPojo>(self)
  }
}

pub struct Nextclade {
  ref_seq: Vec<Nuc>,
  ref_peptides: TranslationMap,
  aa_motifs_ref: AaMotifsMap,
  gene_map: GeneMap,
  primers: Vec<PcrPrimer>,
  tree: AuspiceTree,
  qc_config: QcConfig,
  virus_properties: VirusProperties,
  gap_open_close_nuc: Vec<i32>,
  gap_open_close_aa: Vec<i32>,
  clade_node_attr_key_descs: Vec<CladeNodeAttrKeyDesc>,
  phenotype_attr_descs: Vec<PhenotypeAttrDesc>,
  aa_motifs_descs: Vec<AaMotifsDesc>,
  aln_params: AlignPairwiseParams,
  include_nearest_node_info: bool,
}

impl Nextclade {
  pub fn new(params: &NextcladeParams) -> Result<Self, Report> {
    let NextcladeParams {
      ref_seq_str,
      gene_map_str,
      tree_str,
      qc_config_str,
      virus_properties_str,
      pcr_primers_str,
    } = params;

    let virus_properties =
      VirusProperties::from_str(virus_properties_str).wrap_err("When parsing virus properties JSON")?;

    let mut alignment_params = AlignPairwiseParams::default();

    // Merge alignment params coming from virus_properties into alignment_params
    if let Some(alignment_params_from_file) = &virus_properties.alignment_params {
      alignment_params.merge_opt(alignment_params_from_file.clone());
    }

    let ref_record = read_one_fasta_str(ref_seq_str).wrap_err("When parsing reference sequence")?;
    let ref_seq = to_nuc_seq(&ref_record.seq).wrap_err("When converting reference sequence")?;

    let gene_map = read_gff3_str(gene_map_str).wrap_err("When parsing gene map")?;

    let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &alignment_params);

    let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &alignment_params);

    let ref_peptides = {
      let mut ref_peptides =
        translate_genes_ref(&ref_seq, &gene_map, &alignment_params).wrap_err("When translating reference genes")?;

      ref_peptides
        .iter_mut()
        .try_for_each(|(name, translation)| -> Result<(), Report> {
          let gene = gene_map
            .get(&translation.gene_name)
            .ok_or_else(|| make_internal_report!("Gene not found in gene map: '{}'", &translation.gene_name))?;
          translation.alignment_range = Range::new(0, gene.len_codon());

          Ok(())
        })?;

      ref_peptides
    };

    let aa_motifs_ref = find_aa_motifs(
      &virus_properties.aa_motifs,
      &ref_peptides.values().cloned().collect_vec(),
    )?;

    let mut tree = AuspiceTree::from_str(tree_str).wrap_err("When parsing reference tree Auspice JSON v2")?;
    tree_preprocess_in_place(&mut tree, &ref_seq, &ref_peptides)?;
    let clade_node_attr_key_descs = tree.clade_node_attr_descs().to_vec();

    let phenotype_attr_descs = get_phenotype_attr_descs(&virus_properties);

    let aa_motifs_descs = virus_properties.aa_motifs.clone();

    let qc_config = QcConfig::from_str(qc_config_str).wrap_err("When parsing QC config JSON")?;

    let primers = PcrPrimer::from_str(pcr_primers_str, &from_nuc_seq(&ref_seq)).wrap_err("When parsing PCR primers")?;

    Ok(Self {
      ref_seq,
      ref_peptides,
      aa_motifs_ref,
      gene_map,
      primers,
      tree,
      qc_config,
      virus_properties,
      gap_open_close_nuc,
      gap_open_close_aa,
      clade_node_attr_key_descs,
      phenotype_attr_descs,
      aa_motifs_descs,
      aln_params: alignment_params,
      include_nearest_node_info: false, // Never emit nearest node info in web, to reduce output size
    })
  }

  #[inline]
  pub fn get_initial_data(&self) -> Result<AnalysisInitialData, Report> {
    Ok(AnalysisInitialData {
      gene_map: json_stringify::<Vec<Gene>>(&self.gene_map.values().cloned().collect())?,
      genome_size: self.ref_seq.len(),
      clade_node_attr_key_descs: json_stringify(&self.clade_node_attr_key_descs)?,
      phenotype_attr_descs: json_stringify(&self.phenotype_attr_descs)?,
      aa_motifs_descs: json_stringify(&self.aa_motifs_descs)?,
      csv_column_config_default: json_stringify(&CsvColumnConfig::default())?,
    })
  }

  pub fn run(&mut self, input: &AnalysisInput) -> Result<AnalysisResult, Report> {
    let AnalysisInput {
      qry_index,
      qry_seq_name,
      qry_seq_str,
    } = input;

    let qry_seq = &to_nuc_seq(qry_seq_str).wrap_err("When converting query sequence")?;

    match nextclade_run_one(
      *qry_index,
      qry_seq_name,
      qry_seq,
      &self.ref_seq,
      &self.ref_peptides,
      &self.aa_motifs_ref,
      &self.gene_map,
      &self.primers,
      &self.tree,
      &self.qc_config,
      &self.virus_properties,
      &self.gap_open_close_nuc,
      &self.gap_open_close_aa,
      &self.aln_params,
      self.include_nearest_node_info,
    ) {
      Ok((qry_seq_aligned_stripped, translations, nextclade_outputs)) => {
        let nextclade_outputs_str =
          json_stringify(&nextclade_outputs).wrap_err("When serializing output results of Nextclade")?;

        let translations_str = json_stringify(&translations).wrap_err("When serializing output translations")?;

        let qry_seq_str = from_nuc_seq(&qry_seq_aligned_stripped);

        Ok(AnalysisResult {
          result: Some(AnalysisOutput {
            analysis_result: nextclade_outputs_str,
            query: qry_seq_str,
            query_peptides: translations_str,
          }),
          error: None,
        })
      }
      Err(err) => {
        let error = report_to_string(&err);
        Ok(AnalysisResult {
          result: None,
          error: Some(error),
        })
      }
    }
  }

  pub fn get_output_tree(&mut self, nextclade_outputs: &[NextcladeOutputs]) -> &AuspiceTree {
    tree_attach_new_nodes_in_place_subtree(
      &mut self.tree,
      nextclade_outputs,
      &self.ref_seq,
      &self.ref_peptides,
      &self.gene_map,
      &self.virus_properties,
    );
    &self.tree
  }
}
