use crate::make_error;
use eyre::{Report, WrapErr};
use indexmap::IndexMap;
use itertools::Itertools;
use lazy_static::lazy_static;
use regex::Regex;

pub fn parse_dataset_attributes(attribute_strs: &[String]) -> Result<IndexMap<String, String>, Report> {
  attribute_strs
    .iter()
    .map(|attr| -> Result<(String, String), Report> { parse_dataset_attribute(attr) })
    .collect::<Result<IndexMap<String, String>, Report>>()
}

const DATASET_ATTR_REGEX: &str = r#"(['"]?(?P<key>.+)['"]?=['"]?(?P<val>.+)['"]?)"#;

pub fn parse_dataset_attribute(s: &str) -> Result<(String, String), Report> {
  lazy_static! {
    static ref RE: Regex = Regex::new(DATASET_ATTR_REGEX)
      .wrap_err_with(|| format!("When compiling regular expression for dataset attributes: '{DATASET_ATTR_REGEX}'"))
      .unwrap();
  }

  if let Some(captures) = RE.captures(s) {
    return match (captures.name("key"), captures.name("val")) {
      (Some(key), Some(val)) => {
        let key: String = key.as_str().to_owned();
        let val: String = val.as_str().to_owned();
        Ok((key, val))
      }
      _ => make_error!("Unable to parse dataset attribute: '{s}'"),
    };
  }
  make_error!("Unable to parse dataset attribute: '{s}'")
}

pub fn format_attribute_list(
  name: &Option<String>,
  reference: &str,
  tag: &str,
  attributes: &IndexMap<String, String>,
) -> String {
  let mut attributes_fmt = IndexMap::<String, String>::new();

  if let Some(name) = name {
    attributes_fmt.insert("name".to_owned(), name.to_owned());
  }
  attributes_fmt.insert("reference".to_owned(), reference.to_owned());
  attributes_fmt.insert("tag".to_owned(), tag.to_owned());
  attributes_fmt.extend(attributes.clone().into_iter());

  attributes_fmt
    .into_iter()
    .map(|(key, val)| format!("{key}='{val}'"))
    .collect_vec()
    .join(", ")
}
