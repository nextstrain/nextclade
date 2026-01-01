"""
Example demonstrating how to read Nextclade pathogen JSON using Python classes generated from JSON schema.
See README.md in the parent directory for instructions.
"""

import sys
import json
from pathlib import Path
from dacite import from_dict
from lib.nextclade_input_pathogen_json import PathogenJson


def read_nextclade_pathogen_json(filepath: str | None = None) -> PathogenJson:
    source = sys.stdin if filepath is None else open(filepath)
    with source as f:
        json_data = json.load(f)
        return from_dict(PathogenJson, json_data)


def dict_get(d: dict, key: str, default=None):
    return d[key] if key in d else default


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else None

    data = read_nextclade_pathogen_json(filepath)

    name = dict_get(data.attributes or {}, "name", "unknown")
    ref_name = dict_get(data.attributes or {}, "reference name", "unknown")
    ref_accession = dict_get(data.attributes or {}, "reference accession", "unknown")

    print(f"Dataset name: {name}")

    if data.shortcuts:
        print(f"aka: {', '.join(data.shortcuts)}")

    print(f"Reference name: {ref_name}")
    print(f"Reference accession: {ref_accession}")

    if data.files:
        print("\nDataset files:")
        dataset_dir = Path(filepath).parent if filepath else Path.cwd()
        for file_type, filename in vars(data.files).items():
            if filename:
                absolute_path = dataset_dir / filename
                print(f"  {file_type}: {absolute_path}")

    if data.alignmentParams:
        print("\nAlignment parameters:")
        params_dict = {k: v for k, v in vars(data.alignmentParams).items() if v is not None}
        print(json.dumps(params_dict, indent=2, default=str))
