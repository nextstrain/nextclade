"""
Example demonstrating how to read Nextclade output NDJSON using Python classes generated from JSON schema.
See README.md in the parent directory for instructions.

Note: NDJSON (Newline Delimited JSON) files contain one JSON object per line.
Each line represents a single sequence analysis result.
"""

import sys
import json
from dacite import from_dict
from lib.nextclade_output_ndjson import ResultJson


def read_nextclade_output_ndjson(filepath: str | None = None):
    """Generator that yields ResultJson objects from NDJSON file"""
    source = sys.stdin if filepath is None else open(filepath)
    with source as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                json_data = json.loads(line)
                yield from_dict(ResultJson, json_data)
            except json.JSONDecodeError as e:
                print(f"Error parsing line {line_num}: {e}", file=sys.stderr)
                continue


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else None

    print(f"Reading NDJSON file '{filepath or '-'}':")
    print(f"| {'Index':^5} | {'Sequence':^40} | {'Clade':^15} | {'QC Status':^12}")
    print("|" + "-" * 7 + "|" + "-" * 42 + "|" + "-" * 17 + "|" + "-" * 14 + "|")

    total_sequences = 0
    qc_status_counts = {}

    for result in read_nextclade_output_ndjson(filepath):
        total_sequences += 1

        # Count QC status
        qc_status = result.qc.overallStatus if result.qc else "unknown"
        qc_status_counts[qc_status] = qc_status_counts.get(qc_status, 0) + 1

        # Display result
        print(f"| {result.index:>5} | {result.seqName:<40} | {result.clade:<15} | {qc_status:<12}")

        # Limit output for demo purposes
        if total_sequences >= 10:
            break

    if total_sequences > 10:
        print(f"... and more (showing first 10 of {total_sequences} sequences)")

    print("\nSummary:")
    print(f"Total sequences processed: {total_sequences}")
    print("QC Status distribution:")
    for status, count in qc_status_counts.items():
        print(f"  {status}: {count}")
