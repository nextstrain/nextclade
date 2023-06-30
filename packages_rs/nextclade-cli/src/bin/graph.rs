use clap::Parser;
use ctor::ctor;
use eyre::{Report, WrapErr};
use nextclade::align::params::AlignPairwiseParams;
use nextclade::graph::graph::convert_graph_to_auspice_tree;
use nextclade::graph::node::GraphNodeKey;
use nextclade::io::json::json_parse;
use nextclade::io::json::json_write;
use nextclade::io::nuc::to_nuc_seq;
use nextclade::make_internal_report;
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::tree::tree::{
  AuspiceGraph, AuspiceTreeEdge, AuspiceTreeNode, TreeBranchAttrs, TreeNodeAttr, TreeNodeAttrs, TreeNodeTempData,
};
use nextclade::tree::tree_preprocess::tree_preprocess_in_place;
use nextclade::utils::global_init::{global_init, setup_logger};
use nextclade_cli::cli::nextclade_cli::{
  nextclade_get_output_filenames, NextcladeArgs, NextcladeCommands, NextcladeRunArgs,
};
use nextclade_cli::cli::nextclade_loop::nextclade_get_inputs;
use nextclade_cli::dataset::dataset_download::DatasetFiles;
use serde_json::Value;

#[ctor]
fn init() {
  global_init();
}

struct Node;
struct Edge;

fn main() -> Result<(), Report> {
  let args = NextcladeArgs::parse();

  setup_logger(args.verbosity.get_filter_level());

  match args.command {
    NextcladeCommands::Run(mut run_args) => {
      nextclade_get_output_filenames(&mut run_args).wrap_err("When deducing output filenames")?;
      graph_run(*run_args)
    }
    #[allow(clippy::unimplemented)]
    _ => unimplemented!(),
  }
}

fn graph_run(run_args: NextcladeRunArgs) -> Result<(), Report> {
  let DatasetFiles {
    ref_record,
    mut tree,
    ref gene_map,
    ..
  } = nextclade_get_inputs(&run_args, &run_args.inputs.genes)?;

  let ref_seq = &to_nuc_seq(&ref_record.seq)?;
  let ref_peptides = &translate_genes_ref(ref_seq, gene_map, &AlignPairwiseParams::default())?;

  let mut graph = tree_preprocess_in_place(&mut tree, ref_seq, ref_peptides)?;

  graph_example_get_node(&graph)?;

  graph_example_insert_node(&mut graph)?;

  if let Some(output_tree) = run_args.outputs.output_tree {
    let root: AuspiceTreeNode = convert_graph_to_auspice_tree(&graph)?;
    tree.tree = root;

    json_write(output_tree, &tree)?;
  }

  Ok(())
}

// Demonstrates how to get node data
fn graph_example_get_node(graph: &AuspiceGraph) -> Result<(), Report> {
  let node_id: usize = 5;

  // Here is how to get a node given it's ID. Graph API uses `GraphNodeKey` type for node keys,
  // which is a thin type-safe wrapper around `usize`.
  let node = graph
    .get_node(GraphNodeKey::new(node_id))
    .ok_or_else(|| make_internal_report!("Node with id '{node_id}' expected to exist, but not found"))?;

  Ok(())
}

// Demonstrates how to insert a node into any place on the graph
fn graph_example_insert_node(graph: &mut AuspiceGraph) -> Result<(), Report> {
  let node_id: usize = 5;

  // Graph nodes carry `AuspiceTreeNode` as a payload. In order to insert a node, let's create a fake payload.
  let new_graph_node_payload: AuspiceTreeNode = create_absolute_nonsense_fake_auspice_node();

  // Create and add the new node to the graph. This node will not be connected to anything yet.
  let new_node_key = graph.add_node(new_graph_node_payload);

  // We need to know where to insert. The new node will go between this node and its parent.
  let target_node_key = GraphNodeKey::new(node_id);

  // Given a new node ID and insertion target ID, insert a new node between target and the parent of the target.
  graph.insert_node_before(
    new_node_key,
    target_node_key,
    AuspiceTreeEdge::new(), // Edge payloads are currently dummy
    AuspiceTreeEdge::new(), // Edge payloads are currently dummy
  )?;

  // At this point:
  //  - New node is now connected to the graph.
  //  - New node is now parent of the target node.
  //  - Parent node of the target node, is now the parent of the new node and grand parent of the target node.
  //  - Graph is agnostic to node payloads, so they were not modified.
  //
  // If payloads need to be adjusted, then here is how to obtain mutable references to the nodes involved
  // (Note: mutable references here can be alive only one at a time. Their lifetimes cannot cross. Reorder code lines to
  // ensure this and/or omit `_mut` to get const references where mutability is not needed.):

  // This is a mutable reference to the target node payload.
  let target = graph.get_node_mut(target_node_key).unwrap().payload_mut();
  target.name = "TARGET NODE!".to_owned();

  // This is a mutable reference to the new node payload.
  let new_node = graph.get_node_mut(new_node_key).unwrap().payload_mut();
  new_node.name = "NEW NODE!".to_owned();

  // This is a mutable reference to the parent. This will be `None` if target node was root.
  let parent_node = graph
    .parent_key_of_by_key(new_node_key)
    .map(|parent_key| graph.get_node_mut(parent_key).unwrap().payload_mut());

  if let Some(parent_node) = parent_node {
    parent_node.name = "PARENT NODE!".to_owned();
  }

  Ok(())
}

fn create_absolute_nonsense_fake_auspice_node() -> AuspiceTreeNode {
  AuspiceTreeNode {
    name: "FAKE".to_owned(),
    branch_attrs: TreeBranchAttrs {
      mutations: std::collections::BTreeMap::default(),
      other: serde_json::Value::default(),
    },
    node_attrs: TreeNodeAttrs {
      div: None,
      clade_membership: TreeNodeAttr {
        value: "FAKE".to_owned(),
        other: serde_json::Value::default(),
      },
      node_type: None,
      region: None,
      country: None,
      division: None,
      placement_prior: None,
      alignment: None,
      missing: None,
      gaps: None,
      non_acgtns: None,
      has_pcr_primer_changes: None,
      pcr_primer_changes: None,
      qc_status: None,
      missing_genes: None,
      other: serde_json::Value::default(),
    },
    children: vec![],
    tmp: TreeNodeTempData::default(),
    other: serde_json::Value::default(),
  }
}
