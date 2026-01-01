"""
Example demonstrating how to read Nextclade internal index JSON using Python classes generated from JSON schema.
See README.md in the parent directory for instructions.

This format is used internally by Nextclade to index available datasets.
Can fetch from local files, URLs, or stdin.
"""

import sys
import json
import urllib.request
from dacite import from_dict
from lib.nextclade_internal_index_json import DatasetsIndexJson

DEFAULT_INDEX_URL = "https://data.clades.nextstrain.org/v3/index.json"
MAX_DATASETS_TO_SHOW = 5


def read_nextclade_internal_index_json(filepath: str | None = None) -> DatasetsIndexJson:
    if filepath is None:
        source = sys.stdin
    elif filepath.startswith(('http://', 'https://')):
        source = urllib.request.urlopen(filepath)
    else:
        source = open(filepath)

    with source as f:
        json_data = json.load(f)
        return from_dict(DatasetsIndexJson, json_data)


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INDEX_URL

    data = read_nextclade_internal_index_json(filepath)

    print(f"Internal index schema version: {data.schemaVersion}")
    print(f"Collections: {len(data.collections)}")

    if data.minimizerIndex:
        print(f"Minimizer index entries: {len(data.minimizerIndex)}")
        for idx_version in data.minimizerIndex:
            print(f"  Version: {idx_version.version}")
            if hasattr(idx_version, 'path') and idx_version.path:
                print(f"    Path: {idx_version.path}")

    print("\nDataset collections:")
    for collection in data.collections:
        print(f"  {collection.meta.id}")
        if collection.meta.title:
            print(f"    Title: {collection.meta.title}")

        for dataset in collection.datasets[:MAX_DATASETS_TO_SHOW]:
            print(f"    Dataset: {dataset.path}")
            if hasattr(dataset, 'version') and dataset.version:
                print(f"      Version: {dataset.version.tag}")
            if hasattr(dataset, 'attributes') and dataset.attributes:
                name = dataset.attributes.get('name', 'unknown')
                print(f"      Name: {name}")

        if len(collection.datasets) > MAX_DATASETS_TO_SHOW:
            remaining_count = len(collection.datasets) - MAX_DATASETS_TO_SHOW
            print(f"    ... and {remaining_count} more datasets")
        print()
