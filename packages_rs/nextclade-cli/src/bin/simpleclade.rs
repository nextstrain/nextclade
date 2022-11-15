use clap::Parser;
use ctor::ctor;
use eyre::{Report, WrapErr};
use itertools::{Either, Itertools};
use log::info;
use nextclade::align::align::align_nuc;
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::align::insertions_strip::{get_aa_insertions, insertions_strip, NucIns};
use nextclade::align::params::AlignPairwiseParams;
use nextclade::analyze::aa_changes::{find_aa_changes, FindAaChangesOutput};
use nextclade::analyze::aa_changes_group::group_adjacent_aa_subs_and_dels;
use nextclade::analyze::divergence::calculate_divergence;
use nextclade::analyze::find_private_aa_mutations::find_private_aa_mutations;
use nextclade::analyze::find_private_nuc_mutations::find_private_nuc_mutations;
use nextclade::analyze::letter_composition::get_letter_composition;
use nextclade::analyze::letter_ranges::{find_aa_letter_ranges, find_letter_ranges, find_letter_ranges_by, NucRange};
use nextclade::analyze::link_nuc_and_aa_changes::{link_nuc_and_aa_changes, LinkedNucAndAaChanges};
use nextclade::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput};
use nextclade::analyze::pcr_primer_changes::get_pcr_primer_changes;
use nextclade::analyze::pcr_primers::PcrPrimer;
use nextclade::analyze::phenotype::{calculate_phenotype, get_phenotype_attr_descs};
use nextclade::analyze::virus_properties::{PhenotypeData, VirusProperties};
use nextclade::io::aa::Aa;
use nextclade::io::fasta::{FastaReader, FastaRecord};
use nextclade::io::gene_map::GeneMap;
use nextclade::io::json::json_write;
use nextclade::io::letter::Letter;
use nextclade::io::nuc::{to_nuc_seq, to_nuc_seq_replacing, Nuc};
use nextclade::qc::qc_config::QcConfig;
use nextclade::qc::qc_run::qc_run;
use nextclade::translate::frame_shifts_flatten::frame_shifts_flatten;
use nextclade::translate::translate_genes::{translate_genes, Translation, TranslationMap};
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::tree::tree::AuspiceTree;
use nextclade::tree::tree_attach_new_nodes::tree_attach_new_nodes_in_place;
use nextclade::tree::tree_find_nearest_node::{tree_find_nearest_node, TreeFindNearestNodeOutput};
use nextclade::tree::tree_preprocess::tree_preprocess_in_place;
use nextclade::types::outputs::{NextalignOutputs, NextcladeOutputs, PeptideWarning, PhenotypeValue};
use nextclade::utils::error::report_to_string;
use nextclade::utils::global_init::{global_init, setup_logger};
use nextclade_cli::cli::nextclade_cli::{
  nextclade_get_output_filenames, NextcladeArgs, NextcladeCommands, NextcladeRunArgs, NextcladeRunInputArgs,
  NextcladeRunOutputArgs,
};
use nextclade_cli::cli::nextclade_loop::{nextclade_get_inputs, NextcladeRecord};
use nextclade_cli::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use nextclade_cli::dataset::dataset_download::DatasetFiles;
use std::collections::HashSet;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  let args = NextcladeArgs::parse();

  setup_logger(args.verbosity.get_filter_level());

  match args.command {
    NextcladeCommands::Run(mut run_args) => {
      nextclade_get_output_filenames(&mut run_args).wrap_err("When deducing output filenames")?;
      simpleclade_run(*run_args)
    }
    #[allow(clippy::unimplemented)]
    _ => unimplemented!(),
  }
}

fn simpleclade_run(run_args: NextcladeRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{run_args:#?}");

  let NextcladeRunArgs {
    inputs:
      NextcladeRunInputArgs {
        input_fastas,
        input_dataset,
        input_ref,
        input_tree,
        input_qc_config,
        input_virus_properties,
        input_pcr_primers,
        input_gene_map,
        genes,
        ..
      },
    outputs:
      NextcladeRunOutputArgs {
        output_all,
        output_basename,
        output_selection,
        output_fasta,
        output_translations,
        output_ndjson,
        output_json,
        output_csv,
        output_tsv,
        output_tree,
        output_insertions,
        output_errors,
        include_reference,
        in_order,
        replace_unknown,
        ..
      },
    alignment_params,
    ..
  } = run_args.clone();

  let DatasetFiles {
    ref_record,
    virus_properties,
    mut tree,
    ref gene_map,
    qc_config,
    primers,
  } = nextclade_get_inputs(&run_args, &genes)?;

  let ref_seq = &to_nuc_seq(&ref_record.seq)?;

  let mut alignment_params = AlignPairwiseParams::default();

  // Merge alignment params coming from virus_properties into alignment_params
  if let Some(alignment_params_from_file) = &virus_properties.alignment_params {
    alignment_params.merge_opt(alignment_params_from_file.clone());
  }

  // Merge alignment params coming from CLI arguments
  alignment_params.merge_opt(run_args.alignment_params);

  info!("Alignment parameters (final):\n{alignment_params:#?}");

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, gene_map, &alignment_params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, &alignment_params);

  let ref_peptides = &translate_genes_ref(ref_seq, gene_map, &alignment_params)?;

  let should_keep_outputs = output_tree.is_some();
  let mut outputs = Vec::<NextcladeOutputs>::new();

  let phenotype_attrs = &get_phenotype_attr_descs(&virus_properties);

  tree_preprocess_in_place(&mut tree, ref_seq, ref_peptides)?;
  let clade_node_attrs = tree.clade_node_attr_descs();

  let mut output_writer = NextcladeOrderedWriter::new(
    gene_map,
    clade_node_attrs,
    phenotype_attrs,
    &output_fasta,
    &output_json,
    &output_ndjson,
    &output_csv,
    &output_tsv,
    &output_insertions,
    &output_errors,
    &output_translations,
    in_order,
  )
  .wrap_err("When creating output writer")?;

  if include_reference {
    output_writer
      .write_ref(&ref_record, ref_peptides)
      .wrap_err("When writing output record for ref sequence")?;
  }

  let mut reader = FastaReader::from_paths(&input_fastas)?;
  loop {
    let mut fasta_record = FastaRecord::default();
    reader.read(&mut fasta_record)?;
    if fasta_record.is_empty() {
      break;
    }

    let FastaRecord { seq_name, seq, index } = fasta_record;

    info!("Processing sequence '{seq_name}'");

    let outputs_or_err = if replace_unknown {
      Ok(to_nuc_seq_replacing(&seq))
    } else {
      to_nuc_seq(&seq)
    }
    .wrap_err_with(|| format!("When processing sequence #{index} '{seq_name}'"))
    .and_then(|qry_seq| {
      simpleclade_run_one(
        index,
        &seq_name,
        &qry_seq,
        ref_seq,
        ref_peptides,
        gene_map,
        &primers,
        &tree,
        &qc_config,
        &virus_properties,
        gap_open_close_nuc,
        gap_open_close_aa,
        &alignment_params,
      )
    });

    let output_record = NextcladeRecord {
      index,
      seq_name,
      outputs_or_err,
    };

    if should_keep_outputs {
      if let Ok((_, _, nextclade_outputs)) = &output_record.outputs_or_err {
        outputs.push(nextclade_outputs.clone());
      }
    }

    output_writer
      .write_record(output_record)
      .wrap_err("When writing output record")?;
  }

  if let Some(output_tree) = output_tree {
    tree_attach_new_nodes_in_place(&mut tree, &outputs);
    json_write(output_tree, &tree)?;
  }

  Ok(())
}

pub fn simpleclade_run_one(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  gene_map: &GeneMap,
  primers: &[PcrPrimer],
  tree: &AuspiceTree,
  qc_config: &QcConfig,
  virus_properties: &VirusProperties,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<(Vec<Nuc>, Vec<Translation>, NextcladeOutputs), Report> {
  let NextalignOutputs {
    stripped,
    alignment,
    translations,
    warnings,
    missing_genes,
    is_reverse_complement,
  } = simplealign_run_one(
    index,
    seq_name,
    qry_seq,
    ref_seq,
    ref_peptides,
    gene_map,
    gap_open_close_nuc,
    gap_open_close_aa,
    params,
  )?;

  let FindNucChangesOutput {
    substitutions,
    deletions,
    alignment_range,
  } = find_nuc_changes(&stripped.qry_seq, &stripped.ref_seq);

  let alignment_start = alignment_range.begin;
  let alignment_end = alignment_range.end;
  let alignment_score = alignment.alignment_score;

  let total_substitutions = substitutions.len();
  let total_deletions = deletions.iter().map(|del| del.length).sum();

  let insertions = stripped.insertions.clone();
  let total_insertions = insertions.iter().map(NucIns::len).sum();

  let missing = find_letter_ranges(&stripped.qry_seq, Nuc::N);
  let total_missing = missing.iter().map(NucRange::len).sum();

  let non_acgtns = find_letter_ranges_by(&stripped.qry_seq, |nuc: Nuc| !(nuc.is_acgtn() || nuc.is_gap()));
  let total_non_acgtns = non_acgtns.iter().map(NucRange::len).sum();

  let nucleotide_composition = get_letter_composition(&stripped.qry_seq);

  let pcr_primer_changes = get_pcr_primer_changes(&substitutions, primers);
  let total_pcr_primer_changes = pcr_primer_changes.iter().map(|pc| pc.substitutions.len()).sum();

  let frame_shifts = frame_shifts_flatten(&translations);
  let total_frame_shifts = frame_shifts.len();

  let FindAaChangesOutput {
    aa_substitutions,
    aa_deletions,
  } = find_aa_changes(
    &stripped.ref_seq,
    &stripped.qry_seq,
    ref_peptides,
    &translations,
    &alignment_range,
    gene_map,
  )?;

  let total_aminoacid_substitutions = aa_substitutions.len();
  let total_aminoacid_deletions = aa_deletions.len();

  let aa_insertions = get_aa_insertions(&translations);
  let total_aminoacid_insertions = aa_insertions.len();

  let unknown_aa_ranges = find_aa_letter_ranges(&translations, Aa::X);
  let total_unknown_aa = unknown_aa_ranges.iter().map(|r| r.length).sum();

  let TreeFindNearestNodeOutput { node, distance } =
    tree_find_nearest_node(tree, &substitutions, &missing, &alignment_range);
  let nearest_node_id = node.tmp.id;
  let clade = node.clade();

  let clade_node_attr_keys = tree.clade_node_attr_descs();
  let clade_node_attrs = node.get_clade_node_attrs(clade_node_attr_keys);

  let private_nuc_mutations = find_private_nuc_mutations(
    node,
    &substitutions,
    &deletions,
    &missing,
    &alignment_range,
    ref_seq,
    virus_properties,
  );

  let private_aa_mutations = find_private_aa_mutations(
    node,
    &aa_substitutions,
    &aa_deletions,
    &unknown_aa_ranges,
    ref_peptides,
    gene_map,
  );

  let divergence = calculate_divergence(node, &private_nuc_mutations, &tree.tmp.divergence_units, ref_seq.len());

  let LinkedNucAndAaChanges {
    substitutions,
    deletions,
    aa_substitutions,
    aa_deletions,
  } = link_nuc_and_aa_changes(&substitutions, &deletions, &aa_substitutions, &aa_deletions);

  let aa_changes_groups = group_adjacent_aa_subs_and_dels(&aa_substitutions, &aa_deletions);

  let total_aligned_nucs = alignment_end - alignment_start;
  let total_covered_nucs = total_aligned_nucs - total_missing - total_non_acgtns;
  let coverage = total_covered_nucs as f64 / ref_seq.len() as f64;

  let phenotype_values = virus_properties.phenotype_data.as_ref().map(|phenotype_data| {
    phenotype_data
      .iter()
      .filter_map(|phenotype_data| {
        let PhenotypeData {
          name,
          name_friendly,
          description,
          gene,
          data,
          ignore,
          ..
        } = phenotype_data;
        if ignore.clades.contains(&clade) {
          return None;
        }
        let phenotype = calculate_phenotype(phenotype_data, &aa_substitutions);
        Some(PhenotypeValue {
          name: name.clone(),
          gene: gene.clone(),
          value: phenotype,
        })
      })
      .collect_vec()
  });

  let qc = qc_run(
    &private_nuc_mutations,
    &nucleotide_composition,
    total_missing,
    &translations,
    &frame_shifts,
    qc_config,
  );

  Ok((
    stripped.qry_seq,
    translations,
    NextcladeOutputs {
      index,
      seq_name: seq_name.to_owned(),
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
      alignment_start,
      alignment_end,
      alignment_score,
      pcr_primer_changes,
      total_pcr_primer_changes,
      clade,
      private_nuc_mutations,
      private_aa_mutations,
      warnings,
      missing_genes,
      divergence,
      coverage,
      phenotype_values,
      qc,
      custom_node_attributes: clade_node_attrs,
      nearest_node_id,
      is_reverse_complement,
    },
  ))
}

pub fn simplealign_run_one(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  gene_map: &GeneMap,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<NextalignOutputs, Report> {
  let alignment = align_nuc(index, seq_name, qry_seq, ref_seq, gap_open_close_nuc, params)?;

  let translations = translate_genes(
    &alignment.qry_seq,
    &alignment.ref_seq,
    ref_peptides,
    gene_map,
    gap_open_close_aa,
    params,
  )?;

  let stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);

  let (translations, mut warnings): (Vec<Translation>, Vec<PeptideWarning>) =
    translations.into_iter().partition_map(|(gene_name, res)| match res {
      Ok(tr) => Either::Left(tr),
      Err(err) => Either::Right(PeptideWarning {
        gene_name,
        warning: report_to_string(&err),
      }),
    });

  let present_genes: HashSet<String> = translations.iter().map(|tr| &tr.gene_name).cloned().collect();

  let missing_genes = gene_map
    .iter()
    .filter_map(|(gene_name, _)| (!present_genes.contains(gene_name)).then(|| gene_name))
    .cloned()
    .collect_vec();

  let is_reverse_complement = alignment.is_reverse_complement;

  if is_reverse_complement {
    warnings.push(PeptideWarning {
      gene_name: "nuc".to_owned(),
      warning: format!("When processing sequence #{index} '{seq_name}': Sequence is reverse-complemented: Seed matching failed for the original sequence, but succeeded for its reverse complement. Outputs will be derived from the reverse complement and 'reverse complement' suffix will be added to sequence ID.")
    });
  }

  Ok(NextalignOutputs {
    stripped,
    alignment,
    translations,
    warnings,
    missing_genes,
    is_reverse_complement,
  })
}
