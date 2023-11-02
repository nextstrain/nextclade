# Tutorial: How to make a new dataset from scratch

This tutorial will walk you through the process of creating a simple Nextclade dataset for Zika virus from scratch.

It does not cover all the bells and whistles of the Nextclade dataset format, but it should be enough to get you started with your own datasets.

It's possible to create minimalistic datasets with just a reference sequence, without tree and even without a GFF3 annotation file. However, we recommend to include all of these, as there are many benefits to having them.

## Prerequisites

- Install the Nextstrain toolchain as described in the [installation instructions](https://docs.nextstrain.org/en/latest/install-nextstrain.html)

## Overview

The process of creating a dataset consists of the following steps:

- Get a `reference.fasta` consensus sequence
- Get a GFF3 annotation file for the reference (and potentially edit it) (`genome_annotation.gff3`)
- Get consensus sequences that are used to make a reference tree (`sequences.json`)
- Create a reference tree from the consensus sequences, using the Nextstrain/Augur toolchain (`tree.json`)
- Create the dataset configuration file (`pathogen.json`)
- Create a README file (`README.md`) with a description of the dataset for end users
- Assemble the dataset by putting all the files a single folder
- Test the dataset
- Publish the dataset and share it
- Submit the dataset to the Nextclade data repository

## Getting the reference sequence

The reference sequence is a consensus sequence of the virus genome. It is used to align the query sequences to, and to annotate the query sequences. It also defines the coordinate system for mutations.

We will use the official Zika virus reference sequence from GenBank: [NC_012532.1](https://www.ncbi.nlm.nih.gov/nuccore/NC_012532.1). Download the sequence 
