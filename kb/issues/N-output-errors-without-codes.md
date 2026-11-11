# Errors and warnings in the output have no machine-readable codes

## Problem

The CSV/TSV and JSON outputs give errors and warnings as message text only. A pipeline cannot tell an alignment failure from a rejection by an optional check, or a band-limit warning from a reverse-complement warning, without parsing the text, which changes between releases. For example, the Loculus preprocessing replaces every Nextclade error with "Nucleotide sequence failed to align", so the rejections of the seed chain check in [pathoplexus/pathoplexus#1217](https://github.com/pathoplexus/pathoplexus/issues/1217) were reported without their cause.

## Code

- Per-sequence errors: the `errors` column of the CSV/TSV writer ([packages/nextclade/src/io/nextclade_csv_row.rs](../../packages/nextclade/src/io/nextclade_csv_row.rs))
- Alignment errors raised with `make_error!` in `fn align_nuc()` ([packages/nextclade/src/align/align.rs](../../packages/nextclade/src/align/align.rs))

## Fix

Give each error and warning kind a stable code, write the code next to the message in every output format, and list the codes in the user docs. The codes are additive output fields.

## Validation

- Unit tests that each error kind of the alignment carries its code
- Output schemas and the docs list the same codes
