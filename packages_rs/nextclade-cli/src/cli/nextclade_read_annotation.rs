use crate::cli::nextclade_cli::NextcladeReadAnnotationArgs;
use eyre::Report;
use nextclade::features::feature_tree::FeatureTree;
use nextclade::gene::gene_map::GeneMap;
use nextclade::gene::gene_map_display::gene_map_to_table_string;
use nextclade::io::file::open_file_or_stdin;
use nextclade::io::json::{json_or_yaml_write, json_stringify, JsonPretty};
use std::io::Read;

pub fn nextclade_read_annotation(args: &NextcladeReadAnnotationArgs) -> Result<(), Report> {
  let content = {
    let mut content = String::new();
    open_file_or_stdin(&args.input_annotation)?.read_to_string(&mut content)?;
    content
  };

  if args.feature_tree {
    handle_feature_tree(args, &content)
  } else {
    handle_genome_annotation(args, &content)
  }
}

fn handle_genome_annotation(args: &NextcladeReadAnnotationArgs, content: &str) -> Result<(), Report> {
  let data = GeneMap::from_str(content)?;

  if args.json {
    println!("{}\n", json_stringify(&data, JsonPretty(true))?);
  } else {
    println!("{}", gene_map_to_table_string(&data)?);
  }

  if let Some(output) = &args.output {
    json_or_yaml_write(output, &data)?;
  }

  Ok(())
}

fn handle_feature_tree(args: &NextcladeReadAnnotationArgs, content: &str) -> Result<(), Report> {
  let data = FeatureTree::from_gff3_str(content)?;

  if args.json {
    println!("{}\n", json_stringify(&data, JsonPretty(true))?);
  } else {
    println!("{}", data.to_pretty_string()?);
  }

  if let Some(output) = &args.output {
    json_or_yaml_write(output, &data)?;
  }

  Ok(())
}
