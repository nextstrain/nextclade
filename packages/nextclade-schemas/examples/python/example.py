"""
Example demonstrating how to read  JSON using Python classes generated from JSON schema.
See README.md in the parent directory for instructions.
```

"""

import sys
import json
from dacite import from_dict
from nextclade_output_json import ResultsJson


def read_nextclade_output_json(filepath: str | None = None) -> ResultsJson:
    source = sys.stdin if filepath is None else open(filepath)
    with source as f:
        json_data = json.load(f)
        return from_dict(data_class=ResultsJson, data=json_data)


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else None

    data = read_nextclade_output_json(filepath)

    n = len(data.results)
    print(
        f"The file '{filepath or '-'}' is correctly formatted and contains analysis results for {n} sequence(s):"
    )

    if n > 0:
        print(f"| {'Index':^5} | {'Sequence':^40} | Clade")

    for result in data.results:
        print(f"| {result.index:>5} | {result.seqName:<40} | {result.clade}")
