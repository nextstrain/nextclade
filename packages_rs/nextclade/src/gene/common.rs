use crate::make_error;
use eyre::Report;
use itertools::Itertools;
use maplit::hashmap;
use std::collections::HashMap;

pub trait Name {
  fn name(&self) -> &str;
}

pub trait Id {
  fn id(&self) -> &str;
}

// Find features which have the same name, but different IDs
pub fn check_duplicates_by_name_and_not_ids<Feat: Name + Id>(feats: &[Feat]) -> Result<(), Report> {
  let mut duplicate_names: HashMap<&str, Vec<&Feat>> = hashmap! {};

  for (i, f1) in feats.iter().enumerate() {
    for (j, f2) in feats.iter().enumerate() {
      if i != j && f1.id() != f2.id() && f1.name() == f2.name() {
        duplicate_names.entry(f1.name()).or_default().push(f1);
      }
    }
  }

  if !duplicate_names.is_empty() {
    let list_of_dupes = duplicate_names
      .into_iter()
      .map(|(name, feats)| {
        let ids = feats.iter().map(|f| f.id()).join(", ");
        format!("  - Name: '{name}'. IDs: '{ids}'")
      })
      .join("\n");
    make_error!("Features with duplicate names, but different IDs found. This is currently not allowed. Please check the genome annotation. The list of duplicates:\n{list_of_dupes}")
  } else {
    Ok(())
  }
}
