#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

cd "$BASEDIR" || exit

# Pass all arguments given to this script on to snakemake
ARGS=("$@")
snakemake "${ARGS[@]}" 2>&1 | tee run.log
