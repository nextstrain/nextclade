use crate::align::align::align_nuc;
use crate::align::insertions_strip::{get_aa_insertions, insertions_strip, AaIns, NucIns};
use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_changes_find::aa_changes_find;
use crate::analyze::aa_changes_find_for_cds::FindAaChangesOutput;
use crate::analyze::aa_changes_group::AaChangesGroup;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::divergence::calculate_branch_length;
use crate::analyze::find_aa_motifs::find_aa_motifs;
use crate::analyze::find_aa_motifs_changes::find_aa_motifs_changes;
use crate::analyze::find_clade_founder::{
  find_clade_founder, find_clade_node_attrs_founders, CladeNodeAttrFounderInfo,
};
use crate::analyze::find_private_aa_mutations::{
  find_private_aa_mutations, FindPrivateAaMutationsParams, PrivateAaMutations,
};
use crate::analyze::find_private_nuc_mutations::{
  find_private_nuc_mutations, FindPrivateNucMutationsParams, PrivateNucMutations,
};
use crate::analyze::find_relative_aa_mutations::{find_relative_aa_mutations, RelativeAaMutations};
use crate::analyze::find_relative_nuc_mutations::{find_relative_nuc_mutations, RelativeNucMutations};
use crate::analyze::letter_composition::get_letter_composition;
use crate::analyze::letter_ranges::{
  find_aa_letter_ranges, find_letter_ranges, find_letter_ranges_by, CdsAaRange, NucRange,
};
use crate::analyze::nuc_alignment::NucAlignment;
use crate::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput};
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::pcr_primer_changes::get_pcr_primer_changes;
use crate::analyze::phenotype::calculate_phenotype;
use crate::analyze::virus_properties::PhenotypeData;
use crate::coord::coord_map_global::CoordMapGlobal;
use crate::coord::position::PositionLike;
use crate::coord::range::{intersect, AaRefRange, NucRefGlobalRange};
use crate::gene::cds_segment::Truncation;
use crate::gene::gene::GeneStrand;
use crate::gene::gene_map::GeneMap;
use crate::graph::node::GraphNodeKey;
use crate::io::gff3_writer::GFF_ATTRIBUTES_TO_REMOVE;
use crate::o;
use crate::qc::qc_run::qc_run;
use crate::run::nextclade_wasm::{AnalysisOutput, Nextclade};
use crate::translate::aa_alignment_ranges::{gather_aa_alignment_ranges, GatherAaAlignmentRangesResult};
use crate::translate::frame_shifts_flatten::frame_shifts_flatten;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::{translate_genes, Translation};
use crate::tree::tree_find_ancestors_of_interest::{graph_find_ancestors_of_interest, AncestralSearchResult};
use crate::tree::tree_find_nearest_node::graph_find_nearest_nodes;
use crate::types::outputs::{NextcladeOutputs, PeptideWarning, PhenotypeValue};
use eyre::Report;
use indexmap::indexmap;
use itertools::Itertools;
use std::collections::{BTreeMap, HashSet};

#[derive(Default)]
struct NextcladeResultWithAa {
  translation: Translation,
  aa_changes_groups: Vec<AaChangesGroup>,
  aa_substitutions: Vec<AaSub>,
  aa_deletions: Vec<AaDel>,
  total_aminoacid_substitutions: usize,
  total_aminoacid_deletions: usize,
  total_aminoacid_insertions: usize,
  nuc_to_aa_muts: BTreeMap<String, Vec<AaSub>>,
  missing_genes: Vec<String>,
  warnings: Vec<PeptideWarning>,
  aa_insertions: Vec<AaIns>,
  frame_shifts: Vec<FrameShift>,
  total_frame_shifts: usize,
  unknown_aa_ranges: Vec<CdsAaRange>,
  total_unknown_aa: usize,
  aa_alignment_ranges: BTreeMap<String, Vec<AaRefRange>>,
  aa_unsequenced_ranges: BTreeMap<String, Vec<AaRefRange>>,
}

#[derive(Default)]
struct NextcladeResultWithGraph {
  clade: Option<String>,
  private_nuc_mutations: PrivateNucMutations,
  private_aa_mutations: BTreeMap<String, PrivateAaMutations>,
  phenotype_values: Option<Vec<PhenotypeValue>>,
  divergence: f64,
  custom_node_attributes: BTreeMap<String, String>,
  nearest_node_id: GraphNodeKey,
  nearest_node_name: String,
  nearest_nodes: Option<Vec<String>>,
  ref_node_search_results: Vec<AncestralSearchResult>,
  relative_nuc_mutations: Vec<RelativeNucMutations>,
  relative_aa_mutations: Vec<RelativeAaMutations>,
  clade_founder_info: Option<CladeNodeAttrFounderInfo>,
  clade_node_attr_founder_info: BTreeMap<String, CladeNodeAttrFounderInfo>,
}

pub fn nextclade_run_one(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  state: &Nextclade,
) -> Result<AnalysisOutput, Report> {
  let Nextclade {
    ref_seq,
    ref_record,
    seed_index,
    gap_open_close_nuc,
    virus_properties,
    params,
    gene_map,
    gap_open_close_aa,
    ref_translation,
    aa_motifs_ref,
    graph,
    primers,
    ref_nodes,
    ..
  } = &state;

  let alignment = align_nuc(
    index,
    seq_name,
    qry_seq,
    ref_seq,
    seed_index,
    gap_open_close_nuc,
    &params.alignment,
  )?;

  let stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);
  let alignment_score = alignment.alignment_score;

  let FindNucChangesOutput {
    substitutions,
    deletions,
    alignment_range,
  } = find_nuc_changes(&stripped.qry_seq, ref_seq);

  let aln = NucAlignment::new(ref_seq, &stripped.qry_seq, &alignment_range);

  let total_substitutions = substitutions.len();
  let total_deletions = deletions.iter().map(NucDelRange::len).sum();

  let insertions = stripped.insertions.clone();
  let total_insertions = insertions.iter().map(NucIns::len).sum();

  let missing = find_letter_ranges(&stripped.qry_seq, Nuc::N);
  let total_missing = missing.iter().map(NucRange::len).sum();

  let non_acgtns = find_letter_ranges_by(&stripped.qry_seq, |nuc: Nuc| !(nuc.is_acgtn() || nuc.is_gap()));
  let total_non_acgtns = non_acgtns.iter().map(NucRange::len).sum();

  let nucleotide_composition = get_letter_composition(&stripped.qry_seq);

  let pcr_primer_changes = get_pcr_primer_changes(&substitutions, primers);
  let total_pcr_primer_changes = pcr_primer_changes.iter().map(|pc| pc.substitutions.len()).sum();

  let total_aligned_nucs = alignment_range.len();
  let total_covered_nucs = total_aligned_nucs - total_missing - total_non_acgtns;
  let coverage = total_covered_nucs as f64 / ref_seq.len() as f64;

  let coord_map_global = CoordMapGlobal::new(&alignment.ref_seq, &alignment.qry_seq);

  let NextcladeResultWithAa {
    translation,
    aa_changes_groups,
    aa_substitutions,
    aa_deletions,
    total_aminoacid_substitutions,
    total_aminoacid_deletions,
    total_aminoacid_insertions,
    nuc_to_aa_muts,
    missing_genes,
    warnings,
    aa_insertions,
    frame_shifts,
    total_frame_shifts,
    unknown_aa_ranges,
    total_unknown_aa,
    aa_alignment_ranges,
    aa_unsequenced_ranges,
  } = if !gene_map.is_empty() {
    let translation = translate_genes(
      &alignment.qry_seq,
      &alignment.ref_seq,
      ref_translation,
      gene_map,
      &coord_map_global,
      &alignment_range,
      gap_open_close_aa,
      &params.alignment,
    )?;

    let present_genes: HashSet<String> = translation
      .iter_genes()
      .flat_map(|(_, gene_tr)| gene_tr.cdses.iter().map(|(_, cds_tr)| cds_tr.name.clone()))
      .collect();

    let missing_genes = gene_map
      .iter_genes()
      .filter_map(|gene| (!present_genes.contains(&gene.name)).then_some(&gene.name))
      .cloned()
      .collect_vec();

    let warnings = {
      let mut warnings = translation
        .iter_genes()
        .flat_map(|(_, gene_tr)| gene_tr.warnings.clone())
        .collect_vec();

      if alignment.is_reverse_complement {
        warnings.push(PeptideWarning {
          cds_name: "nuc".to_owned(),
          warning: format!("When processing sequence #{index} '{seq_name}': Sequence is reverse-complemented: Seed matching failed for the original sequence, but succeeded for its reverse complement. Outputs will be derived from the reverse complement and 'reverse complement' suffix will be added to sequence ID."),
        });
      }

      warnings
    };

    let aa_insertions = get_aa_insertions(&translation);

    let frame_shifts = frame_shifts_flatten(&translation);
    let total_frame_shifts = frame_shifts.len();

    let FindAaChangesOutput {
      aa_changes_groups,
      aa_substitutions,
      aa_deletions,
      nuc_to_aa_muts,
    } = aa_changes_find(&aln, ref_translation, &translation, gene_map, &params.aa_changes)?;

    let total_aminoacid_substitutions = aa_substitutions.len();
    let total_aminoacid_deletions = aa_deletions.len();
    let total_aminoacid_insertions = aa_insertions.len();

    let unknown_aa_ranges = find_aa_letter_ranges(&translation, Aa::X);
    let total_unknown_aa = unknown_aa_ranges.iter().map(|r| r.length).sum();

    let GatherAaAlignmentRangesResult {
      aa_alignment_ranges,
      aa_unsequenced_ranges,
    } = gather_aa_alignment_ranges(&translation, gene_map);

    NextcladeResultWithAa {
      translation,
      aa_changes_groups,
      aa_substitutions,
      aa_deletions,
      total_aminoacid_substitutions,
      total_aminoacid_deletions,
      total_aminoacid_insertions,
      nuc_to_aa_muts,
      missing_genes,
      warnings,
      aa_insertions,
      frame_shifts,
      total_frame_shifts,
      unknown_aa_ranges,
      total_unknown_aa,
      aa_alignment_ranges,
      aa_unsequenced_ranges,
    }
  } else {
    NextcladeResultWithAa::default()
  };

  let NextcladeResultWithGraph {
    clade,
    private_nuc_mutations,
    private_aa_mutations,
    clade_founder_info,
    clade_node_attr_founder_info,
    ref_node_search_results,
    relative_nuc_mutations,
    relative_aa_mutations,
    phenotype_values,
    divergence,
    custom_node_attributes,
    nearest_node_id,
    nearest_node_name,
    nearest_nodes,
  } = if let Some(graph) = graph {
    let nearest_node_candidates = graph_find_nearest_nodes(graph, &substitutions, &missing, &alignment_range)?;
    let nearest_node_id = nearest_node_candidates[0].node_key;
    let nearest_node = graph.get_node(nearest_node_id)?.payload();
    let nearest_node_name = nearest_node.name.clone();

    let nearest_nodes = params.general.include_nearest_node_info.then_some(
      nearest_node_candidates
        .iter()
        // Choose all nodes with distance equal to the distance of the nearest node
        .filter(|n| n.distance == nearest_node_candidates[0].distance)
        .map(|n| Ok(graph.get_node(n.node_key)?.payload().name.clone()))
        .collect::<Result<Vec<String>, Report>>()?,
    );

    let clade = nearest_node.clade();

    let clade_node_attr_descs = graph.data.meta.clade_node_attr_descs();
    let clade_node_attrs = nearest_node.get_clade_node_attrs(clade_node_attr_descs);

    let nuc_params = FindPrivateNucMutationsParams {
      graph,
      substitutions: &substitutions,
      deletions: &deletions,
      missing: &missing,
      alignment_range: &alignment_range,
      ref_seq,
      non_acgtns: &non_acgtns,
      virus_properties,
    };

    let aa_params = FindPrivateAaMutationsParams {
      graph,
      aa_substitutions: &aa_substitutions,
      aa_deletions: &aa_deletions,
      aa_unknowns: &unknown_aa_ranges,
      aa_unsequenced_ranges: &aa_unsequenced_ranges,
      ref_translation,
      qry_translation: &translation,
      gene_map,
      aln: &aln,
      params: &params.aa_changes,
    };

    let private_nuc_mutations = find_private_nuc_mutations(nearest_node, &nuc_params);

    let private_aa_mutations = find_private_aa_mutations(nearest_node, &aa_params)?;

    let parent_div = nearest_node.node_attrs.div.unwrap_or(0.0);
    let masked_ranges = graph.data.meta.placement_mask_ranges();
    let divergence = parent_div
      + calculate_branch_length(
        &private_nuc_mutations.private_substitutions,
        masked_ranges,
        graph.data.tmp.divergence_units,
        ref_seq.len(),
      );

    let clade_founder_info = find_clade_founder(graph, nearest_node_id, &clade, &nuc_params, &aa_params)?;

    let clade_node_attr_founder_info =
      find_clade_node_attrs_founders(graph, nearest_node_id, clade_node_attr_descs, &nuc_params, &aa_params)?;

    let ref_node_search_results = graph_find_ancestors_of_interest(graph, nearest_node_id, ref_nodes)?;

    let relative_nuc_mutations = find_relative_nuc_mutations(&ref_node_search_results, &nuc_params)?;

    let relative_aa_mutations = find_relative_aa_mutations(&ref_node_search_results, &aa_params)?;

    let phenotype_values = virus_properties.phenotype_data.as_ref().map(|phenotype_data| {
      phenotype_data
        .iter()
        .filter_map(|phenotype_data| {
          let PhenotypeData { name, cds, ignore, .. } = phenotype_data;
          if let Some(clade) = &clade {
            if ignore.clades.contains(clade) {
              return None;
            }
          }
          let phenotype = calculate_phenotype(phenotype_data, &aa_substitutions);
          Some(PhenotypeValue {
            name: name.clone(),
            cds: cds.clone(),
            value: phenotype,
          })
        })
        .collect_vec()
    });

    NextcladeResultWithGraph {
      clade,
      private_nuc_mutations,
      private_aa_mutations,
      clade_founder_info,
      clade_node_attr_founder_info,
      ref_node_search_results,
      relative_nuc_mutations,
      relative_aa_mutations,
      phenotype_values,
      divergence,
      custom_node_attributes: clade_node_attrs,
      nearest_node_id,
      nearest_node_name,
      nearest_nodes,
    }
  } else {
    NextcladeResultWithGraph::default()
  };

  let aa_motifs = find_aa_motifs(&virus_properties.aa_motifs, &translation)?;
  let aa_motifs_changes = find_aa_motifs_changes(aa_motifs_ref, &aa_motifs, ref_translation, &translation)?;

  let qc = virus_properties
    .qc
    .as_ref()
    .map(|qc_config| {
      qc_run(
        &private_nuc_mutations,
        &nucleotide_composition,
        total_missing,
        &translation,
        &frame_shifts,
        qc_config,
      )
    })
    .unwrap_or_default();

  let is_reverse_complement = alignment.is_reverse_complement;

  let annotation = calculate_qry_annotation(
    index,
    seq_name,
    gene_map,
    &coord_map_global,
    &alignment_range,
    is_reverse_complement,
  )?;

  Ok(AnalysisOutput {
    query: stripped.qry_seq,
    translation,
    analysis_result: NextcladeOutputs {
      index,
      seq_name: seq_name.to_owned(),
      ref_name: ref_record.seq_name.clone(),
      substitutions,
      total_substitutions,
      deletions,
      total_deletions,
      insertions,
      total_insertions,
      missing,
      total_missing,
      non_acgtns,
      total_non_acgtns,
      nucleotide_composition,
      frame_shifts,
      total_frame_shifts,
      aa_substitutions,
      total_aminoacid_substitutions,
      aa_deletions,
      total_aminoacid_deletions,
      aa_insertions,
      total_aminoacid_insertions,
      unknown_aa_ranges,
      total_unknown_aa,
      aa_changes_groups,
      nuc_to_aa_muts,
      alignment_range,
      alignment_score,
      aa_alignment_ranges,
      aa_unsequenced_ranges,
      pcr_primer_changes,
      total_pcr_primer_changes,
      warnings,
      missing_cdses: missing_genes,
      coverage,
      aa_motifs,
      aa_motifs_changes,
      qc,
      clade,
      private_nuc_mutations,
      private_aa_mutations,
      clade_founder_info,
      clade_node_attr_founder_info,
      ref_nodes: ref_nodes.to_owned(),
      ref_node_search_results,
      relative_nuc_mutations,
      relative_aa_mutations,
      phenotype_values,
      divergence,
      custom_node_attributes,
      nearest_node_id,
      nearest_node_name,
      nearest_nodes,
      is_reverse_complement,
      annotation,
    },
  })
}

/// Calculate genome annotation for query sequence in query coordinates
pub fn calculate_qry_annotation(
  index: usize,
  seq_name: &str,
  gene_map: &GeneMap,
  coord_map_global: &CoordMapGlobal,
  alignment_range: &NucRefGlobalRange,
  is_reverse_complement: bool,
) -> Result<GeneMap, Report> {
  let mut gene_map = gene_map.clone();

  let seq_id = seq_name.split(' ').next().unwrap_or_default().to_owned();

  let mut additional_attributes = indexmap! {
    o!("seq_index") => vec![index.to_string()],
  };

  if is_reverse_complement {
    additional_attributes.insert(o!("is_reverse_complement"), vec![o!("true")]);
  }

  for gene in &mut gene_map.genes {
    let gene_id = format!("Gene-{}-{}", index, gene.id);

    gene.gff_seqid = Some(seq_id.clone());

    GFF_ATTRIBUTES_TO_REMOVE.iter().for_each(|attr| {
      gene.attributes.remove(*attr);
    });

    gene.attributes.extend(additional_attributes.clone());

    // Add ID attribute to be able to link child CDSes back to this gene. Make it unique by appending seq index.
    gene.attributes.insert(o!("ID"), vec![gene_id.clone()]);

    // Add Name if not present
    if !gene.attributes.contains_key("Name") {
      gene.attributes.insert(o!("Name"), vec![gene.name.clone()]);
    }

    // If there's no "product" attribute, let's add it as CDS name
    if !gene.attributes.contains_key("product") {
      gene.attributes.insert(o!("product"), vec![gene.name.clone()]);
    }

    // Take only the part of the gene range which is within the alignment range
    let included_range = intersect(alignment_range, &gene.range);

    // Convert included segment range from reference to query coordinates
    let aln_range = coord_map_global.ref_to_qry_range(&included_range);
    // HACK: the type of the range is incorrect here: GeneMap expects NucRefGlobalRange, i.e. range in reference
    // coordinates, because it was initially designed for reference annotations only. Here we dangerously "cast"
    // the NucAlnGlobalRange to the NucRefGlobalRange to satisfy this limitation.
    // TODO: modify GeneMap class to allow for different range types, or just use plain range without subtyping.
    gene.range = NucRefGlobalRange::from_range(aln_range);

    for cds in &mut gene.cdses {
      cds.attributes.extend(additional_attributes.clone());

      for seg in &mut cds.segments {
        let segment_id = format!("CDS-{}-{}", index, seg.id);
        seg.attributes.insert(o!("ID"), vec![segment_id.clone()]);

        seg.gff_seqid = Some(seq_id.clone());
        seg.attributes.extend(additional_attributes.clone());

        //dbg!(&seg);
        GFF_ATTRIBUTES_TO_REMOVE.iter().for_each(|attr| {
          seg.attributes.remove(*attr);
        });

        // Link this CDS segment to its parent gene
        seg.attributes.insert(o!("Parent"), vec![gene_id.clone()]);

        // Add Name if not present
        if !seg.attributes.contains_key("Name") {
          seg.attributes.insert(o!("Name"), vec![seg.name.clone()]);
        }

        // If there's no "product" attribute, let's add it as CDS name
        if !seg.attributes.contains_key("product") {
          seg.attributes.insert(o!("product"), vec![seg.name.clone()]);
        }

        // Take only the part of the segment which is within the alignment range
        let included_range = intersect(alignment_range, &seg.range);

        // Note if the feature is incomplete at the 5p (left) end
        if seg.range.begin < included_range.begin {
          let truncation = included_range.begin - seg.range.begin;
          if seg.strand == GeneStrand::Forward {
            // Adjust phase to correctly label start of codon
            seg.phase = seg.phase.shifted_by(truncation)?;
            seg.truncation = Truncation::FivePrime(truncation.as_usize());
          }
          // add note to list of Notes, add new attribute if it doesn't exist
          seg.attributes.insert(o!("truncated-5p"), vec![truncation.to_string()]);
        }

        // Note if the feature is incomplete at the 3p (right) end
        if seg.range.end > included_range.end {
          let truncation = seg.range.end - included_range.end;
          if seg.strand == GeneStrand::Reverse {
            // Adjust phase to correctly label start of codon
            seg.phase = seg.phase.shifted_by(truncation)?;
            seg.truncation = Truncation::ThreePrime(truncation.as_usize());
          }
          seg.attributes.insert(o!("truncated-3p"), vec![truncation.to_string()]);
        }

        // Convert included segment range from reference to query coordinates
        let aln_range = coord_map_global.ref_to_qry_range(&included_range);
        // HACK: the type of the range is incorrect here: GeneMap expects NucRefGlobalRange, i.e. range in reference
        // coordinates, because it was initially designed for reference annotations only. Here we dangerously "cast"
        // the NucAlnGlobalRange to the NucRefGlobalRange to satisfy this limitation.
        // TODO: modify GeneMap class to allow for different range types, or just use plain range without subtyping.
        seg.range = NucRefGlobalRange::from_range(aln_range);
      }

      // Remove empty CDS segments
      cds.segments.retain(|seg| !seg.is_empty());

      // TODO: once we support proteins, modify protein coordinates as well
      // for protein in &mut cds.proteins {}
    }

    // Remove empty CDS
    gene.cdses.retain(|cds| !cds.is_empty());
  }

  // Remove empty genes
  gene_map.genes.retain(|gene| !gene.is_empty());

  Ok(gene_map)
}
