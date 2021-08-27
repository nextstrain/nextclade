#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

# Directory where this script resides
THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/../../..)"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

INPUT_FASTA="${PROJECT_ROOT_DIR}/data/sars-cov-2/sequences.fasta"
INPUT_ROOT_SEQ="${PROJECT_ROOT_DIR}/data/sars-cov-2/reference.fasta"
INPUT_GENE_MAP="${PROJECT_ROOT_DIR}/data/sars-cov-2/genemap.gff"
INPUT_TREE="${PROJECT_ROOT_DIR}/data/sars-cov-2/tree.json"
INPUT_QC_CONFIG="${PROJECT_ROOT_DIR}/data/sars-cov-2/qc.json"
INPUT_PCR_PRIMERS="${PROJECT_ROOT_DIR}/data/sars-cov-2/primers.csv"
GENES="E,M,N,ORF10,ORF14,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S"

OUT_DIR="${PROJECT_ROOT_DIR}/tmp"
OUT_DIR_OLD="${PROJECT_ROOT_DIR}/tmp/old"
OUT_DIR_NEW="${PROJECT_ROOT_DIR}/tmp/new"

NEXTCLADE_JS_DEFAULT="packages/cli/dist/nextclade.js"
NEXTCLADE_JS="${NEXTCLADE_JS:=${NEXTCLADE_JS_DEFAULT}}"

NEXTCLADE_JS_FLAGS_DEFAULT="\
--input-fasta=${INPUT_FASTA} \
--input-tree=${INPUT_TREE} \
--output-json=${OUT_DIR_OLD}/out.json \
--output-tsv=${OUT_DIR_OLD}/out.tsv \
--output-csv=${OUT_DIR_OLD}/out.csv \
--output-tree=${OUT_DIR_OLD}/tree.json \
"
#--input-root-seq=${INPUT_ROOT_SEQ} \
#--input-qc-config=${INPUT_QC_CONFIG} \
#--input-pcr-primers=${INPUT_PCR_PRIMERS} \
#--input-gene-map=${INPUT_GENE_MAP} \

NEXTCLADE_JS_FLAGS="${NEXTCLADE_JS_FLAGS:=${NEXTCLADE_JS_FLAGS_DEFAULT}}"

mkdir -p "${OUT_DIR_OLD}"
echo ""
echo "Running Nextclade JS"
echo "node ${NEXTCLADE_JS} ${NEXTCLADE_JS_FLAGS}"
node ${NEXTCLADE_JS} ${NEXTCLADE_JS_FLAGS}
echo ""

NEXTCLADE_CPP_DEFAULT=".out/bin/nextclade-Linux-x86_64"
NEXTCLADE_CPP="${NEXTCLADE_CPP:=${NEXTCLADE_CPP_DEFAULT}}"

NEXTCLADE_CPP_FLAGS_DEFAULT="\
--in-order \
--input-fasta=${INPUT_FASTA} \
--input-root-seq=${INPUT_ROOT_SEQ} \
--input-tree=${INPUT_TREE} \
--input-qc-config=${INPUT_QC_CONFIG} \
--input-pcr-primers=${INPUT_PCR_PRIMERS} \
--input-gene-map=${INPUT_GENE_MAP} \
--output-json=${OUT_DIR_NEW}/out.json \
--output-tsv=${OUT_DIR_NEW}/out.tsv \
--output-csv=${OUT_DIR_NEW}/out.csv \
--output-tree=${OUT_DIR_NEW}/tree.json \
--output-dir=${OUT_DIR_NEW}/ignore \
"

NEXTCLADE_CPP_FLAGS="${NEXTCLADE_CPP_FLAGS:=${NEXTCLADE_CPP_FLAGS_DEFAULT}}"

mkdir -p "${OUT_DIR_NEW}"
echo ""
echo "Running Nextclade C++"
echo "${NEXTCLADE_CPP} ${NEXTCLADE_CPP_FLAGS}"
${NEXTCLADE_CPP} ${NEXTCLADE_CPP_FLAGS}
echo ""
