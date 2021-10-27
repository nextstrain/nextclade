#!/usr/bin/env bash

set -euxo pipefail

trap "exit" INT

OPENJOURNALS_PATH="/usr/local/share/openjournals"

PDF_INFILE="paper.md"
PDF_LOGO="figures/empty.png"
PDF_TEMPLATE="${OPENJOURNALS_PATH}/latex.template"
PDF_OUTFILE="preprint.pdf"

authors="$(ob-paper get ${PDF_INFILE} authors:name)"
title="$(ob-paper get ${PDF_INFILE} title)"
repository="https://github.com/nextstrain/nextclade"
archive_doi="InReview"
citation_author="InReview"
editor_name="InReview"
formatted_doi="InReview"
issue="InReview"
journal_name="InReview"
page="InReview"
paper_url="InReview"
published="InReview"
review_issue_url="InReview"
reviewers="InReview"
submitted="InReview"
volume="InReview"
year="InReview"

/usr/local/bin/pandoc \
  --defaults="${OPENJOURNALS_PATH}/docker-defaults.yaml" \
  --defaults="${OPENJOURNALS_PATH}/joss/defaults.yaml" \
  -V title="${title}" \
  -V repository="${repository}" \
  -V archive_doi="${archive_doi}" \
  -V citation_author="${citation_author}" \
  -V editor_name="${editor_name}" \
  -V formatted_doi="${formatted_doi}" \
  -V issue="${issue}" \
  -V journal_name="${journal_name}" \
  -V page="${page}" \
  -V paper_url="${paper_url}" \
  -V published="${published}" \
  -V review_issue_url="${review_issue_url}" \
  -V reviewers="${reviewers}" \
  -V submitted="${submitted}" \
  -V volume="${volume}" \
  -V year="${year}" \
  -V graphics="false" \
  -V logo_path="${PDF_LOGO}" \
  -V geometry:margin=1in \
  --citeproc \
  --standalone \
  --verbose \
  --pdf-engine=xelatex \
  --from markdown+autolink_bare_uris \
  --template "${PDF_TEMPLATE}" \
  --output "${PDF_OUTFILE}" \
  "${PDF_INFILE}"

