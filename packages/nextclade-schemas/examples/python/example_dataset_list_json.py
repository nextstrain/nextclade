"""
Example demonstrating how to read Nextclade dataset list JSON using Python classes generated from JSON schema.
See README.md in the parent directory for instructions.
"""

import sys
import json
from typing import List
from dacite import from_dict
from lib.nextclade_output_dataset_list_json import Dataset


def read_nextclade_dataset_list_json(filepath: str | None = None) -> List[Dataset]:
  source = sys.stdin if filepath is None else open(filepath)
  with source as f:
    json_data = json.load(f)
    return [from_dict(Dataset, item) for item in json_data]


if __name__ == "__main__":
  filepath = sys.argv[1] if len(sys.argv) > 1 else None

  datasets = read_nextclade_dataset_list_json(filepath)

  print(f"Found {len(datasets)} datasets")
  print()
  for dataset in datasets:
    print(f"Dataset: {dataset.path}")

    name = "unknown"
    if dataset.attributes and "name" in dataset.attributes:
      name = dataset.attributes["name"]
    print(f"  Name: {name}")

    reference_name = "unknown"
    if dataset.attributes and "reference name" in dataset.attributes:
      reference_name = dataset.attributes["reference name"]
    print(f"  Reference name: {reference_name}")

    reference_accession = "unknown"
    if dataset.attributes and "reference accession" in dataset.attributes:
      reference_accession = dataset.attributes["reference accession"]
    print(f"  Reference accession: {reference_accession}")

    clades = "unknown"
    if dataset.capabilities and dataset.capabilities.clades is not None:
      clades = dataset.capabilities.clades
    print(f"  Clades: {clades}")

    version_tag = "unknown"
    if dataset.version and dataset.version.tag:
      version_tag = dataset.version.tag
    print(f"  Latest version: {version_tag}")

    print()

