use ctor::ctor;
use eyre::Report;
use nextclade::tree::tree::{AuspiceTree, AuspiceTreeNode};
use nextclade::utils::global_init::global_init;
use std::str::FromStr;

#[cfg(all(target_family = "linux", target_arch = "x86_64"))]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  let tree_str = std::fs::read_to_string("data_dev/tree-nextclade.json")?;

  let mut tree = AuspiceTree::from_str(&tree_str)?;

  tree.map_nodes_mut(|node| {
    node.name = "Aaa".to_owned();
  });

  tree.map_nodes(|AuspiceTreeNode { name, .. }| {
    println!("{name:}");
  });

  let out = tree.to_string_pretty()?;

  std::fs::write("data_dev/tree-nextclade-2.json", out)?;

  Ok(())
}
