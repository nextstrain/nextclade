"""
Example demonstrating how to read Nextclade internal minimizer index JSON using Python classes generated from JSON schema.
See README.md in the parent directory for instructions.

This format contains minimizer index data used internally by Nextclade for fast sequence searching.
Can fetch from local files, URLs, or stdin.
"""

import sys
import json
import urllib.request
from dacite import from_dict
from lib.nextclade_internal_minimizer_index_json import MinimizerIndexJson

DEFAULT_MINIMIZER_INDEX_URL = "https://data.clades.nextstrain.org/v3/minimizer_index.json"
MAX_MINIMIZERS_TO_SHOW = 5
MAX_NORMALIZATION_VALUES_TO_SHOW = 10
MAX_REFERENCES_TO_SHOW = 10


def read_nextclade_minimizer_index_json(filepath: str | None = None) -> MinimizerIndexJson:
    if filepath is None:
        source = sys.stdin
    elif filepath.startswith(('http://', 'https://')):
        source = urllib.request.urlopen(filepath)
    else:
        source = open(filepath)

    with source as f:
        json_data = json.load(f)
        return from_dict(MinimizerIndexJson, json_data)


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MINIMIZER_INDEX_URL

    data = read_nextclade_minimizer_index_json(filepath)

    print(f"Minimizer index schema version: {data.schemaVersion}")
    print(f"Index version: {data.version}")

    print("\nIndex parameters:")
    print(f"  k-mer size (k): {data.params.k}")
    print(f"  Cutoff: {data.params.cutoff}")

    if data.minimizers:
        print(f"\nMinimizers: {len(data.minimizers)} entries")

        ref_id_to_name = {i: ref.name for i, ref in enumerate(data.references)} if data.references else {}

        ref_counts = {}
        total_refs = 0
        for ref_list in data.minimizers.values():
            total_refs += len(ref_list)
            for ref_id in ref_list:
                ref_counts[ref_id] = ref_counts.get(ref_id, 0) + 1

        avg_refs_per_minimizer = total_refs / len(data.minimizers) if data.minimizers else 0
        print(f"  Average references per minimizer: {avg_refs_per_minimizer:.2f}")

        if ref_counts:
            most_common_ref = max(ref_counts.items(), key=lambda x: x[1])
            ref_id, count = most_common_ref
            ref_name = ref_id_to_name.get(ref_id, f"ref {ref_id}")
            print(f"  Most referenced sequence: {ref_name} ({count} minimizers)")

        print("  Sample minimizers:")
        minimizer_items = list(data.minimizers.items())[:MAX_MINIMIZERS_TO_SHOW]
        for minimizer, ref_list in minimizer_items:
            ref_count = len(ref_list)
            if ref_count == 1:
                ref_name = ref_id_to_name.get(ref_list[0], f"ref {ref_list[0]}")
                print(f"    {minimizer} → {ref_name}")
            else:
                ref_names = [ref_id_to_name.get(ref_id, f"ref {ref_id}") for ref_id in ref_list]
                print(f"    {minimizer} → {ref_count} refs: {ref_names}")

        if len(data.minimizers) > MAX_MINIMIZERS_TO_SHOW:
            print(f"    ... and {len(data.minimizers) - MAX_MINIMIZERS_TO_SHOW} more")

    if data.references:
        print(f"\nReference sequences: {len(data.references)}")

        total_length = sum(ref.length for ref in data.references)
        total_minimizers = sum(ref.nMinimizers for ref in data.references)
        avg_length = total_length / len(data.references)
        avg_minimizers = total_minimizers / len(data.references)

        print(f"  Total sequence length: {total_length} bases")
        print(f"  Average sequence length: {avg_length:.0f} bases")
        print(f"  Total minimizers across all sequences: {total_minimizers}")
        print(f"  Average minimizers per sequence: {avg_minimizers:.0f}")

        print("  Sample references:")
        sorted_refs = sorted(data.references, key=lambda ref: ref.nMinimizers, reverse=True)
        for ref in sorted_refs[:MAX_REFERENCES_TO_SHOW]:
            print(f"    {ref.name}: {ref.length} bases, {ref.nMinimizers} minimizers")

        if len(data.references) > MAX_REFERENCES_TO_SHOW:
            print(f"    ... and {len(data.references) - MAX_REFERENCES_TO_SHOW} more")

    if data.normalization:
        print(f"\nNormalization factors: {len(data.normalization)} values")

        min_val = min(data.normalization)
        max_val = max(data.normalization)
        avg_val = sum(data.normalization) / len(data.normalization)

        print(f"  Range: {min_val:.6f} to {max_val:.6f}")
        print(f"  Average: {avg_val:.6f}")

        if len(data.normalization) <= MAX_NORMALIZATION_VALUES_TO_SHOW:
            print(f"  Values: {[f'{x:.6f}' for x in data.normalization]}")
        else:
            first_few = [f'{x:.6f}' for x in data.normalization[:3]]
            last_few = [f'{x:.6f}' for x in data.normalization[-3:]]
            print(f"  First 3: {first_few}")
            print(f"  Last 3: {last_few}")
