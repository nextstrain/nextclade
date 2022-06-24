#!/usr/bin/env bash

set -euxo pipefail

# Modified version of a script by dnanto
# https://github.com/nextstrain/nextclade/pull/673#issuecomment-1007488135

# Retrieves sequence data from NIH using entrez-direct package
#   conda config --add channels bioconda
#   conda install entrez-direct

here=$(cd $(dirname "${BASH_SOURCE[0]}"); pwd)

# Reference sequence is expected to be the first entry in the list
ref_id=$(head -1 "${here}/id.txt")

efetch -id "${ref_id}" -db "nuccore" -format "fasta" > "${here}/../reference.fasta"

cat "${here}/id.txt" | efetch -db "nuccore" -format "fasta" > "${here}/../sequences.fasta"
