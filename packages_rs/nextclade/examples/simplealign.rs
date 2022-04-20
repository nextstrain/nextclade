use ctor::ctor;
use eyre::{Report, WrapErr};
use log::info;
use nextclade::align::align::AlignPairwiseParams;
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::cli::nextalign_cli::{nextalign_parse_cli_args, NextalignCommands, NextalignRunArgs};
use nextclade::cli::nextalign_loop::{nextalign_run_one, NextalignRecord};
use nextclade::cli::nextalign_ordered_writer::NextalignOrderedWriter;
use nextclade::gene::gene_map::GeneMap;
use nextclade::io::fasta::{read_one_fasta, FastaReader, FastaRecord};
use nextclade::io::gff3::read_gff3_file;
use nextclade::io::nuc::to_nuc_seq;
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::utils::global_init::global_init;

#[cfg(all(target_family = "linux", target_arch = "x86_64"))]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

/// Retrieves value from an `Option` or returns an internal error.
/// To be used on `Option` which we know is `Some` on runtime.
#[macro_export(local_inner_macros)]
macro_rules! option_get_some {
  ($x:ident) => {{
    $x.ok_or_else(|| {
      nextclade::make_internal_report!(
        "Expected `Some` value, found `None`, in `Option` variable `{}`",
        std::stringify!($x)
      )
    })
  }};
}

fn main() -> Result<(), Report> {
  let args = nextalign_parse_cli_args()?;

  match args.command {
    Some(NextalignCommands::Run { 0: run_args }) => nextalign_run(*run_args),
    _ => Ok(()),
  }
}

fn nextalign_run(args: NextalignRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{args:#?}");

  let NextalignRunArgs {
    input_fasta,
    input_ref,
    genes,
    input_gene_map,
    output_dir,
    output_basename,
    include_reference,
    output_fasta,
    output_insertions,
    output_errors,
    jobs,
    in_order,
  } = args;

  let params = &AlignPairwiseParams::default();
  info!("Params:\n{params:#?}");

  let output_fasta = option_get_some!(output_fasta)?;
  let output_basename = option_get_some!(output_basename)?;
  let output_dir = option_get_some!(output_dir)?;
  let output_insertions = option_get_some!(output_insertions)?;
  let output_errors = option_get_some!(output_errors)?;

  let ref_record = &read_one_fasta(input_ref)?;
  let ref_seq = &to_nuc_seq(&ref_record.seq)?;

  let gene_map = &match (input_gene_map, genes) {
    // Read gene map and retain only requested genes
    (Some(input_gene_map), Some(genes)) => read_gff3_file(&input_gene_map)?
      .into_iter()
      .filter(|(gene_name, ..)| genes.contains(gene_name))
      .collect(),
    _ => GeneMap::new(),
  };

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, gene_map, params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, params);

  let ref_peptides = &translate_genes_ref(ref_seq, gene_map, params)?;

  let mut output_writer = NextalignOrderedWriter::new(
    gene_map,
    &output_fasta,
    &output_insertions,
    &output_errors,
    &output_dir,
    &output_basename,
    in_order,
  )
  .wrap_err("When creating output writer")?;

  let mut reader = FastaReader::from_path(&input_fasta)?;

  loop {
    let mut record = FastaRecord::default();
    reader.read(&mut record)?;
    if record.is_empty() {
      break;
    }

    let FastaRecord { seq_name, seq, index } = record;
    info!("Processing sequence '{seq_name}'");

    let qry_seq = to_nuc_seq(&seq).wrap_err_with(|| format!("When processing sequence #{index} '{seq_name}'"))?;

    let outputs_or_err = nextalign_run_one(
      &qry_seq,
      ref_seq,
      ref_peptides,
      gene_map,
      gap_open_close_nuc,
      gap_open_close_aa,
      params,
    );

    if include_reference {
      output_writer
        .write_ref(ref_record, ref_peptides)
        .wrap_err("When writing output record for ref sequence")?;
    }

    output_writer
      .write_record(NextalignRecord {
        index,
        seq_name,
        outputs_or_err,
      })
      .wrap_err("When writing output record")?;
  }

  Ok(())
}
