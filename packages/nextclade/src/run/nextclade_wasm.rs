use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat, GapScoreMap};
use crate::align::seed_match::CodonSpacedIndex;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::alphabet::nuc::{to_nuc_seq, to_nuc_seq_replacing, Nuc};
use crate::analyze::find_aa_motifs::find_aa_motifs;
use crate::analyze::find_aa_motifs_changes::AaMotifsMap;
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::phenotype::get_phenotype_attr_descs;
use crate::analyze::virus_properties::{AaMotifsDesc, PhenotypeAttrDesc, VirusProperties};
use crate::gene::gene_map::{filter_gene_map, GeneMap};
use crate::graph::graph::Graph;
use crate::io::fasta::{read_one_fasta_str, FastaRecord};
use crate::io::nextclade_csv::CsvColumnConfig;
use crate::io::nwk_writer::convert_graph_to_nwk_string;
use crate::run::nextclade_run_one::nextclade_run_one;
use crate::run::params::{NextcladeInputParams, NextcladeInputParamsOptional};
use crate::translate::translate_genes::Translation;
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::tree::{check_ref_seq_mismatch, AuspiceGraph, AuspiceRefNodesDesc, AuspiceTree, CladeNodeAttrKeyDesc};
use crate::tree::tree_builder::graph_attach_new_nodes_in_place;
use crate::tree::tree_preprocess::graph_preprocess_in_place;
use crate::types::outputs::NextcladeOutputs;
use crate::utils::any::AnyType;
use crate::utils::option::{find_some, OptionMapRefFallible};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use optfield::optfield;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[optfield(pub NextcladeParamsOptional, attrs, doc, field_attrs, field_doc, merge_fn = pub)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParams {
  pub dataset_name: String,
  #[schemars(with = "String")]
  pub ref_record: FastaRecord,
  pub gene_map: GeneMap,
  pub tree: Option<AuspiceTree>,
  pub virus_properties: VirusProperties,
}

impl NextcladeParams {
  pub fn from_auspice(
    auspice_json: &AuspiceTree,
    overrides: &NextcladeParamsOptional,
    cdses: &Option<Vec<String>>,
  ) -> Result<Self, Report> {
    let virus_properties = find_some(&[
      &overrides.virus_properties,
      &auspice_json.meta.extensions.nextclade.pathogen,
    ])
    .cloned()
    .unwrap_or_default();

    let ref_record = {
      match &overrides.ref_record {
        Some(ref_record) => ref_record.clone(),
        None => {
          let ref_name = virus_properties
            .attributes
            .get("reference name")
            .cloned()
            .unwrap_or_else(|| AnyType::String("reference".to_owned()))
            .as_str()
            .wrap_err(
              "When reading Auspice JSON v2 `.meta.extensions.nextclade.pathogen.attributes[\"reference name\"]`",
            )?
            .to_owned();

          let ref_seq = auspice_json.root_sequence.as_ref().and_then(|root_sequence| root_sequence.get("nuc"))
          .ok_or_else(|| eyre!("Auspice JSON v2 is used as input dataset, but does not contain required reference sequence field (.root_sequence.nuc) and a reference sequence is not provided any other way."))?.to_owned();

          FastaRecord {
            index: 0,
            seq_name: ref_name,
            seq: ref_seq,
          }
        }
      }
    };

    let gene_map = {
      match &overrides.gene_map {
        Some(gene_map) => gene_map.clone(),
        None => auspice_json
          .meta
          .genome_annotations
          .map_ref_fallible(GeneMap::from_auspice_annotations)?
          .map(|gene_map| filter_gene_map(gene_map, cdses))
          .unwrap_or_default(),
      }
    };

    let tree = {
      match &overrides.tree {
        Some(tree) => Some(tree.to_owned()),
        None => Some(auspice_json.to_owned()),
      }
    };

    Ok(Self {
      dataset_name: overrides.dataset_name.as_ref().unwrap().clone(),
      ref_record,
      gene_map,
      tree,
      virus_properties,
    })
  }

  pub fn from_raw(raw: NextcladeParamsRaw) -> Result<Self, Report> {
    match raw {
      NextcladeParamsRaw::Auspice(raw) => {
        let auspice_json = AuspiceTree::from_str(raw.auspice_json)?;

        let dataset_name = Some("Auspice JSON".to_owned());

        let overrides = {
          let virus_properties = raw
            .virus_properties
            .map_ref_fallible(VirusProperties::from_str)
            .wrap_err("When parsing pathogen JSON")?;

          let ref_record = raw
            .ref_seq
            .map_ref_fallible(read_one_fasta_str)
            .wrap_err("When parsing reference sequence")?;

          let tree = raw
            .tree
            .map_ref_fallible(AuspiceTree::from_str)
            .wrap_err("When parsing reference tree Auspice JSON v2")?;

          let gene_map = raw
            .gene_map
            .map_ref_fallible(GeneMap::from_str)
            .wrap_err("When parsing genome annotation")?;

          if let (Some(tree), Some(ref_record)) = (&tree, &ref_record) {
            if let Some(tree_ref) = tree.root_sequence() {
              check_ref_seq_mismatch(&ref_record.seq, tree_ref)?;
            }
          }

          NextcladeParamsOptional {
            dataset_name,
            ref_record,
            gene_map,
            tree,
            virus_properties,
          }
        };

        Self::from_auspice(&auspice_json, &overrides, &None)
      }
      NextcladeParamsRaw::Dir(raw) => {
        let dataset_name = raw.dataset_name;

        let virus_properties =
          VirusProperties::from_str(&raw.virus_properties).wrap_err("When parsing pathogen JSON")?;

        let ref_record = read_one_fasta_str(&raw.ref_seq).wrap_err("When parsing reference sequence")?;

        let tree = raw
          .tree
          .map(|tree| AuspiceTree::from_str(tree).wrap_err("When parsing reference tree Auspice JSON v2"))
          .transpose()?;

        let gene_map = raw
          .gene_map
          .map(|gene_map| GeneMap::from_str(gene_map).wrap_err("When parsing genome annotation"))
          .transpose()?
          .unwrap_or_default();

        if let Some(tree) = &tree {
          if let Some(tree_ref) = tree.root_sequence() {
            check_ref_seq_mismatch(&ref_record.seq, tree_ref)?;
          }
        }

        Ok(Self {
          dataset_name,
          ref_record,
          gene_map,
          tree,
          virus_properties,
        })
      }
    }
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParamsRawAuspice {
  pub auspice_json: String,
  pub ref_seq: Option<String>,
  pub gene_map: Option<String>,
  pub tree: Option<String>,
  pub virus_properties: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeParamsRawDir {
  pub dataset_name: String,
  #[schemars(with = "String")]
  pub ref_seq: String,
  pub gene_map: Option<String>,
  pub tree: Option<String>,
  pub virus_properties: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
pub enum NextcladeParamsRaw {
  Auspice(NextcladeParamsRawAuspice),
  Dir(NextcladeParamsRawDir),
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
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub default_cds: Option<String>,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub cds_order_preference: Vec<String>,
  pub clade_node_attr_key_descs: &'a [CladeNodeAttrKeyDesc],
  pub phenotype_attr_descs: &'a [PhenotypeAttrDesc],
  pub ref_nodes: &'a AuspiceRefNodesDesc,
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
  pub dataset_name: String,

  // Always present
  pub ref_record: FastaRecord,
  pub ref_seq: Vec<Nuc>,
  pub seed_index: CodonSpacedIndex,
  pub gap_open_close_nuc: Vec<i32>,
  pub virus_properties: VirusProperties,
  pub primers: Vec<PcrPrimer>,
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
  pub ref_nodes: AuspiceRefNodesDesc,
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
  pub fn new(
    inputs: NextcladeParams,
    primers: Vec<PcrPrimer>,
    params: &NextcladeInputParamsOptional,
  ) -> Result<Self, Report> {
    let NextcladeParams {
      dataset_name,
      ref_record,
      gene_map,
      tree,
      virus_properties,
    } = inputs;

    let params = NextcladeInputParams::from_optional(params, &virus_properties)?;
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
        let mut graph = Graph::from_auspice_tree(tree).wrap_err("When converting Auspice tree to Nextclade graph")?;

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

    let ref_nodes = graph
      .as_ref()
      .map(|graph| graph.data.meta.reference_nodes())
      .cloned()
      .unwrap_or_default();

    Ok(Self {
      dataset_name,
      ref_record,
      ref_seq,
      seed_index,
      gap_open_close_nuc,
      virus_properties,
      primers,
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
      ref_nodes,
    })
  }

  pub fn get_initial_data(&self) -> AnalysisInitialData {
    AnalysisInitialData {
      gene_map: self.gene_map.clone(),
      genome_size: self.ref_seq.len(),
      default_cds: self.virus_properties.default_cds.clone(),
      cds_order_preference: self.virus_properties.cds_order_preference.clone(),
      clade_node_attr_key_descs: &self.clade_attr_descs,
      phenotype_attr_descs: &self.phenotype_attr_descs,
      ref_nodes: &self.ref_nodes,
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
      graph_attach_new_nodes_in_place(graph, results, self.ref_seq.len(), &self.params.tree_builder)?;
      let auspice = Graph::to_auspice_tree(graph)?;
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
