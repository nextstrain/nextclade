# CVA10 dataset: keep the VP4 start codon in ambiguous deletions with Nextclade 3.25.0

Nextclade can place an ambiguous deletion just before a CDS over the start codon of that CDS. In CVA10 with `"gapAlignmentSide": "left"`, an 8-nt deletion at the end of the 5' UTR removes the `A` of the VP4 `ATG` in 8 of 497 GenBank genomes. Nextclade 3.25.0 (2026-10-13) fixes this with the opt-in alignment parameter `penaltyGapEnterCds`, and it warns when a start codon is lost. This report explains the cause, gives measurements on 3.25.0, and lists the dataset and workflow changes, the reproduction links, the checks, and the open items, including the state of the other datasets of `nextclade_data`.

## Links

- Implementation: no pull request. The commits went to `nextstrain/nextclade` `master` directly and shipped in Nextclade 3.25.0 (2026-10-13) [[changelog](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/CHANGELOG.md?plain=1#L3)]
  - `bc0755526` docs(align): describe gap alignment side by where gaps go [[commit](https://github.com/nextstrain/nextclade/commit/bc075552682bb884ded2fb4f17c8bc4d39472ec6)]
  - `a8f479212` feat(align): add penalty for deletions that enter a CDS [[commit](https://github.com/nextstrain/nextclade/commit/a8f479212e50e7c0d3a636b7c43ac00792755dd2)]
  - `59894ff27` feat: warn about lost start codons [[commit](https://github.com/nextstrain/nextclade/commit/59894ff2770aa6863212c562a610ba34f044cb51)]
  - `4a0666fe7` fix: skip start codon check for mature peptides of polyproteins [[commit](https://github.com/nextstrain/nextclade/commit/4a0666fe716fc4d61d94c1ab678db206ce112d9a)]
- Release: Nextclade 3.25.0 (2026-10-13) [[release](https://github.com/nextstrain/nextclade/releases/tag/3.25.0)], on bioconda as package `nextclade` 3.25.0, which also provides the `nextclade3` command
- Showcase data: draft pull request [nextstrain/nextclade_data#482](https://github.com/nextstrain/nextclade_data/pull/482), branch `feat/align-gap-cost-cds-entry` at [`7dc6e5bf`](https://github.com/nextstrain/nextclade_data/tree/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10), not for merge. It holds a copy of the CVA10 dataset with the fix and the mpox datasets with the fix
  - CVA10 `pathogen.json` with `penaltyGapEnterCds` and `compatibility` [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10/pathogen.json#L18-L37)], example `>MW929252` [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10/sequences.fasta#L3221)]
  - mpox `all-clades` `pathogen.json` with `penaltyGapEnterCds` and `compatibility` [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/nextstrain/mpox/all-clades/pathogen.json#L3-L19)]
- Dataset pull request: [nextstrain/nextclade_data#466](https://github.com/nextstrain/nextclade_data/pull/466), branch `add-cva10` at [`fefe1a7d`](https://github.com/nextstrain/nextclade_data/tree/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10), unchanged (`left`, no penalty) [[data](https://github.com/nextstrain/nextclade_data/blob/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10/pathogen.json#L18-L30)]
- Workflow: [enterovirus-phylo/nextclade_a10](https://github.com/enterovirus-phylo/nextclade_a10), which uses `"gapAlignmentSide": "right"` [[data](https://github.com/enterovirus-phylo/nextclade_a10/blob/03402fd0a188d0d38c1a54cbfa7d685a0b9e38eb/dataset/pathogen.json#L30)] since commit `03402fd0a` (2026-10-14) [[commit](https://github.com/enterovirus-phylo/nextclade_a10/commit/03402fd0a)]
- Documentation:
  - alignment, CDS boundaries and `penaltyGapEnterCds` [[doc](https://docs.nextstrain.org/projects/nextclade/en/stable/user/algorithm/01-sequence-alignment.html#:~:text=penaltyGapEnterCds)]
  - CLI argument `--penalty-gap-enter-cds` [[doc](https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-cli/reference.html#:~:text=penalty-gap-enter-cds)]
  - lost start codon warning [[doc](https://docs.nextstrain.org/projects/nextclade/en/stable/user/output-files/errors-and-warnings.html#:~:text=Lost%20start%20codon)]

## Problem

Some CVA10 genomes have an 8-nt deletion at the end of the 5' UTR, just before VP4. In the inferred ancestral reference of the dataset, VP4 is the CDS 745-951 [[data](https://github.com/nextstrain/nextclade_data/blob/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10/genome_annotation.gff3#L7)]. The query has an intact `ATG`, but the deletion has two placements with the same alignment score. Example, MW929252.1, reference columns 733-747:

```
ref     GAACACAAGAAAATG    VP4 ATG at 745-747
left    GAACA--------TG    deletion 738-745: the UTR A at 737 is aligned as the start codon A
right   GAAC--------ATG    deletion 737-744: all in the UTR, ATG intact
```

With `"gapAlignmentSide": "left"`, Nextclade selects 738-745. VP4 then translates as `XGAQVSTQK...` instead of `MGAQVSTQK...`, and nothing in the QC flags it.

The GenBank query `txid42769[Organism:exp] AND 6000:8000[SLEN]` returns 497 CVA10 genomes. 8 of them have this deletion: MW929252.1, MW929254.1, MW929276.1, MW929295.1, MW929296.1, MW929297.1, MW929299.1 and MW929300.1. None of the 30 example sequences in [nextclade_data#466](https://github.com/nextstrain/nextclade_data/pull/466) has it.

## Cause

The codon-aware gap-open penalties (`penaltyGapOpenInFrame`, `penaltyGapOpenOutOfFrame`) apply only at the base where a deletion starts. Both placements start in the UTR, so both pay `penaltyGapOpen` (13) [[data](https://github.com/nextstrain/nextclade_data/blob/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10/pathogen.json#L19)] plus the same extension cost. The codon-aware penalties never apply, and no setting of the existing penalties can separate the two placements.

`gapAlignmentSide` then selects one of the tied placements. `left` moves the aligned bases to the left and places ambiguous gaps at their 3'-most position, and `right` places them at their 5'-most position. Before 3.25.0, the documentation described the two values the other way around.

## What Nextclade 3.25.0 adds

- `alignmentParams.penaltyGapEnterCds` (CLI argument `--penalty-gap-enter-cds`): an extra penalty for a deletion that extends from a position outside of all CDSs into a CDS. The default is 0, which changes nothing
  - Parameter: `penalty_gap_enter_cds` in `struct AlignPairwiseParams` [[src](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade/src/align/params.rs#L82)]
  - Penalty map: `fn get_gap_open_close_scores_codon_aware()` adds the penalty to the deletion extension cost at the first coding base after a non-coding base [[src](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade/src/align/gap_open.rs#L53-L57)]
- Lost start codon warning: `fn find_lost_start_codons()` [[src](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade/src/analyze/find_lost_start_codons.rs#L46)] reports it in the `warnings` column of TSV and CSV outputs, in the `warnings` array of JSON and NDJSON outputs, and in Nextclade Web. For this deletion, the message is "In CDS 'VP4': The start codon is lost: the first codon is 'ATG' in the reference and '-TG' in the query. ..."
- Corrected documentation of `gapAlignmentSide`
- Older versions: Nextclade versions before 3.25.0 ignore `penaltyGapEnterCds` without an error and give the previous placement. A dataset that sets the parameter must therefore set `compatibility.cli` and `compatibility.web` to `3.25.0`

### Value of the penalty

The value $P$ of `penaltyGapEnterCds` has three thresholds:

$$P \ge 1, \qquad P > \pi_{\text{in}} - \pi_{\text{open}}, \qquad P > s_{\text{match}} + \pi_{\text{mis}}$$

where:

- $P$: `penaltyGapEnterCds`
- $\pi_{\text{open}}$: `penaltyGapOpen`, 13 in CVA10 [[data](https://github.com/nextstrain/nextclade_data/blob/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10/pathogen.json#L19)]
- $\pi_{\text{in}}$: `penaltyGapOpenInFrame`, 18 in CVA10 [[data](https://github.com/nextstrain/nextclade_data/blob/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10/pathogen.json#L21)]
- $s_{\text{match}}$: `scoreMatch`, 3 with the `high-diversity` preset
- $\pi_{\text{mis}}$: `penaltyMismatch`, 1 with the `high-diversity` preset

The effect of each threshold:

- $P \ge 1$: an ambiguous deletion stays outside of the CDS when an equally good placement exists
- $P > \pi_{\text{in}} - \pi_{\text{open}} = 5$: a deletion that cuts into a CDS also costs more than an in-frame deletion inside of the CDS. This case can occur with both gap sides
- $P > s_{\text{match}} + \pi_{\text{mis}} = 4$: the aligner can add a substitution to avoid a deletion that enters a CDS. This did not happen in the 497 genomes

For CVA10, $P = 6$ is the smallest value that meets the second threshold. $P = 1$ and $P = 6$ give identical results on the 497 genomes.

## Measurements

These runs used the official Docker image `nextstrain/nextclade:3.25.0` and the dataset files of [nextclade_data#466](https://github.com/nextstrain/nextclade_data/pull/466) at [`fefe1a7d`](https://github.com/nextstrain/nextclade_data/tree/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10), with only the alignment parameters changed. The reference tree of that dataset was built from `left` alignments.

| Setting | VP4 not starting with `M` (of 497) | Lost start codon warnings | Genomes changed vs. `left` without penalty | Examples changed (of 30) |
| --- | --- | --- | --- | --- |
| `left`, no penalty ([nextclade_data#466](https://github.com/nextstrain/nextclade_data/pull/466)) | 8 | 8 | - | - |
| `left`, penalty 1 | 0 | 0 | 8 | 0 |
| `left`, penalty 6 | 0 | 0 | 8 | 0 |
| `right`, no penalty (current workflow) | 0 | 0 | 288 | 22 |
| `right`, penalty 6 | 0 | 0 | 288, identical to `right` without penalty | 22 |

The compared columns are clade, QC score and status, alignment score, substitutions, deletions, insertions, frameshifts, aa substitutions, aa deletions, aa insertions, private substitutions, QC private mutation total and warnings.

- `left` with the penalty changes only the 8 genomes:
  - the deletion moves from 738-745 to 737-744, VP4 starts with `MGAQ`, and the warning disappears
  - `unknownAaRanges` loses `VP4:1`, and `cdsCoverage` and `totalUnknownAa` change with it
  - alignment score, substitutions, frameshifts, QC status, QC score and clade do not change
  - the tree stores the old deletion position, so the QC private mutation total rises from 0 to 1, and the mutations relative to the clade founder and the tree nodes change. A tree rebuilt from the new alignment removes this difference
- `right` fixes the same 8 genomes, and moves every other ambiguous indel to its 5'-most position. Most differences against the `left` tree come from the tree, which stores `left` placements, so a tree rebuilt from `right` alignments removes most of them. Genomes that differ:
  - substitutions: 223
  - private substitutions: 221
  - QC score: 31
  - frameshift ranges: 2
- The original `nextclade3 run` command of the workflow (CLI arguments, `--alignment-preset high-diversity`, `--gap-alignment-side left`) with `--penalty-gap-enter-cds 6` added: VP4 starts with `M` in all 498 records (497 genomes and the reference). Without the argument, 8 start with `X`

## Reproduction

The showcase data of [nextclade_data#482](https://github.com/nextstrain/nextclade_data/pull/482) at [`7dc6e5bf`](https://github.com/nextstrain/nextclade_data/tree/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10) has the CVA10 copy with these fields:

- `alignmentParams`: `"penaltyGapEnterCds": 6` and `"gapAlignmentSide": "left"` [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10/pathogen.json#L18-L32)]
- `compatibility`: `"cli": "3.25.0"`, `"web": "3.25.0"` [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10/pathogen.json#L34-L37)]
- example sequences: `>MW929252` [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10/sequences.fasta#L3221)]
- changelog entry [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10/CHANGELOG.md?plain=1#L5)]

- Nextclade Web, with the fix: https://clades.nextstrain.org/?dataset-url=gh:nextstrain/nextclade_data@7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17@/data/enpen/enterovirus/cva10&input-fasta=example
- Nextclade Web, without the fix (the dataset of [nextclade_data#466](https://github.com/nextstrain/nextclade_data/pull/466) at [`fefe1a7d`](https://github.com/nextstrain/nextclade_data/tree/fefe1a7d7588a75258af612317380d9666d074c4/data/enpen/enterovirus/cva10), with the same sequences): https://clades.nextstrain.org/?dataset-url=gh:nextstrain/nextclade_data@fefe1a7d7588a75258af612317380d9666d074c4@/data/enpen/enterovirus/cva10&input-fasta=gh:nextstrain/nextclade_data@7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17@/data/enpen/enterovirus/cva10/sequences.fasta
- What to look at: the row of MW929252. Without the fix, its name has the warning "In CDS 'VP4': The start codon is lost", and with VP4 selected in the sequence selector (default: "Nucleotide sequence"), the peptide starts with `X`. With the fix, there is no warning, and VP4 starts with `M`
- Nextclade CLI (3.25.0 or newer):

  ```bash
  mkdir -p cva10
  for f in pathogen.json reference.fasta genome_annotation.gff3 tree.json sequences.fasta README.md CHANGELOG.md; do
    curl -fsSL -o "cva10/$f" "https://raw.githubusercontent.com/nextstrain/nextclade_data/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/enpen/enterovirus/cva10/$f"
  done
  nextclade run --input-dataset cva10 --output-translations 'fixed/{cds}.fasta' cva10/sequences.fasta
  nextclade run --input-dataset cva10 --penalty-gap-enter-cds 0 --output-translations 'before/{cds}.fasta' cva10/sequences.fasta
  grep -A1 '>MW929252' before/VP4.fasta fixed/VP4.fasta
  ```

  Expected: MW929252 starts with `XGAQVSTQK` in `before/VP4.fasta` and with `MGAQVSTQK` in `fixed/VP4.fasta`
- Tree: MW929252 is a leaf of the reference tree, which stores the previous deletion position. With the fix, its QC private mutation total is 1 until the tree is rebuilt with the new setting

## Options for the dataset

Both options fix VP4 in the tested genomes, and both need Nextclade 3.25.0 or later. The choice belongs to the dataset maintainers.

- Option A, `left` with `penaltyGapEnterCds: 6`: keeps `left`. Compared with earlier `left` outputs, only genomes with a deletion that enters a CDS change
- Option B, `right` with `penaltyGapEnterCds: 6`: keeps the current workflow setting. The penalty changes nothing in the 497 genomes. It protects against a deletion that cuts into a CDS when that costs less than an in-frame deletion inside of the CDS, which can happen with both gap sides. `right` without the penalty also works with older Nextclade versions, but it does not have this protection

## Steps

Work on a branch. Do not edit generated outputs by hand: the workflow rebuilds them.

1. Nextclade version: install bioconda `nextclade` 3.25.0 or later, then check `nextclade3 --version`
2. `dataset/pathogen.json`:
   - set `alignmentParams.gapAlignmentSide` to `"left"` (option A) or `"right"` (option B)
   - add `"penaltyGapEnterCds": 6` to `alignmentParams`
   - set `compatibility.cli` and `compatibility.web` to `"3.25.0"`
3. `Snakefile`, rule `align` [[src](https://github.com/enterovirus-phylo/nextclade_a10/blob/cac3c9e28b0db5fb8865017a8893a5139c054b1a/Snakefile#L263-L312)]: the rule passes each alignment parameter as a CLI argument and uses `--input-ref` and `--input-annotation`, so Nextclade does not read `pathogen.json` there. Add the parameter in both places, next to `gapAlignmentSide`:

   ```python
           gap_alignment_side = config["alignmentParams"]["gapAlignmentSide"],
           penalty_gap_enter_cds = config["alignmentParams"]["penaltyGapEnterCds"],
   ```

   ```bash
           --gap-alignment-side {params.gap_alignment_side} \
           --penalty-gap-enter-cds {params.penalty_gap_enter_cds} \
   ```

   The rules `test` and `test_clades` run with `--input-dataset`, so they read the value from the assembled `pathogen.json` and need no change
4. Example sequences: add `MW929252` to `resources/include_examples.txt`, in the same ID format as the other entries, so that the dataset examples contain this deletion
5. Rebuild: run the workflow from the alignment onward: tree, refinement, ancestral reconstruction, clades, export and dataset assembly. The tree stores deletion positions, and nearest-node search and private mutations compare the query with it
6. `dataset/CHANGELOG.md`: add an entry, for example "Ambiguous deletions just before VP4 no longer remove the VP4 start codon (alignment parameter `penaltyGapEnterCds`, requires Nextclade 3.25.0)"
7. Dataset pull request: copy the rebuilt dataset (`out-dataset/`) to `data/enpen/enterovirus/cva10/` on branch `add-cva10` of [nextclade_data#466](https://github.com/nextstrain/nextclade_data/pull/466). The CVA10 copy in [nextclade_data#482](https://github.com/nextstrain/nextclade_data/pull/482) shows the expected `pathogen.json` settings and examples for option A

## Verification

The 8 genomes are in the results only if the `filter` rule keeps them. Run these checks after the rebuild:

```bash
# VP4 starts with M in every translated genome
seqkit seq -s results/translations/cds_VP4.translation.fasta | cut -c1 | sort | uniq -c

# No lost start codon warning
grep -c 'start codon is lost' results/nextclade.tsv

# Deletion position in the 8 genomes
csvtk grep -t -f seqName -r -p 'MW9292(52|54|76|95|96|97|99)\.1|MW929300\.1' results/nextclade.tsv \
  | csvtk cut -t -f seqName,deletions,warnings

# The new example genome is in the dataset examples
grep -c 'MW929252' out-dataset/sequences.fasta
```

Expected results:

- VP4 start: only `M`. A genome with `N` or unsequenced bases at the VP4 start can show `X`
- Warnings: `0`
- Deletions: each of the 8 genomes lists `737-744`, not `738-745`, and has no warning
- Examples: `1`
- Isolated effect (option A): run rule `align` once with `penaltyGapEnterCds` 0 and once with 6 on the same filtered input, then compare the two `results/nextclade.tsv` files. Only the rows of genomes with a deletion that enters a CDS differ, in the columns `deletions`, `warnings`, `unknownAaRanges`, `totalUnknownAa` and `cdsCoverage`. Rule `align` runs without the tree, so it has no private mutation columns

## Notes

- Value of the penalty: keep it at 6. Above $s_{\text{match}} + \pi_{\text{mis}} = 4$, the aligner can prefer a substitution to a deletion that enters a CDS, and 6 is the smallest value that also covers a deletion that cuts into a CDS
- Nextclade Web and `--input-dataset` runs read the penalty from `pathogen.json`, so they need no extra argument
- Tested genomes: the measurements used the 497 GenBank genomes. The workflow's own filtered input was not available for testing

## Open items

These items are not resolved yet. Each item has a record in the knowledge base, linked by its path.

### Nextclade

- The penalty is opt-in: the default of `penaltyGapEnterCds` is 0. Whether a future major Nextclade release changes the default, and to which value, is not decided. Set the value explicitly in `pathogen.json`. Record: [kb/issues/N-align-cds-entry-penalty-off-by-default.md](../issues/N-align-cds-entry-penalty-off-by-default.md)
- Amino acid indel names can differ from the nucleotide deletion: `fn translate_cds()` removes the gaps from each CDS [[src](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade/src/translate/translate_genes.rs#L272)], translates it, and aligns the peptide to the reference peptide again [[src](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade/src/translate/translate_genes.rs#L280-L287)]. In repeats, this second alignment can place an amino acid deletion at another codon than the nucleotide deletion, with both gap sides. A change that makes amino acid indels follow the nucleotide indels is in development and not released. Record: [kb/issues/H-translate-aa-indels-ignore-nuc-alignment.md](../issues/H-translate-aa-indels-ignore-nuc-alignment.md). Examples with Nextclade 3.25.0:
  - CVA10 KY272007.1 with `left`: the nucleotide deletion 1390-1392 removes VP2 codon 147, but the output reports `VP2:G148-` and `VP2:P147R`. With `right`, the deletion is 1387-1389 and the output `VP2:H146-`, which agree
  - SARS-CoV-2 Delta example USA/CO-CDC-MMB10752210/2021 in `nextstrain/sars-cov-2/wuhan-hu-1/orfs`: the nucleotide deletion 22029-22034 covers S codons 156-158, but the output reports `S:D138-` and `S:P139-`
- A default fix for start codon ties is in development: a tie-break that keeps start codons in tied deletion placements without any parameter is in development and not released. With `penaltyGapEnterCds` set, the VP4 case needs no further change. Record: [kb/issues/N-align-in-frame-deletion-tie-at-cds-start.md](../issues/N-align-in-frame-deletion-tie-at-cds-start.md)
- Lost start codon warning with `--cds-selection`: `fn find_cdses_with_start_codon()` [[src](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade/src/analyze/find_lost_start_codons.rs#L25)] skips mature peptides that continue the reading frame of the CDS before them (for example HIV-1 `p7`, dengue `E`). With `--cds-selection`, the CDS before can be filtered out, and the mature peptide then gets a false warning. Record: [kb/issues/N-start-codon-warning-ignores-unselected-cdses.md](../issues/N-start-codon-warning-ignores-unselected-cdses.md)
- `ignoredFrameShifts` matches exact codon ranges only: `fn is_frame_shift_ignored()` [[src](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade/src/qc/qc_rule_frame_shifts.rs#L8)]. A change of gap side or penalty moves frameshift ranges, so check the list after such a change. Record: [kb/issues/N-qc-ignored-frameshifts-exact-codon-range.md](../issues/N-qc-ignored-frameshifts-exact-codon-range.md)
- The workflow's own filtered input set is not tested: all measurements used GenBank genomes

### Other datasets

Nextclade 3.25.0 on the example sequences of the 108 annotated datasets of `nextclade_data` `master`, with their own settings. Record: [kb/issues/H-datasets-lost-start-codon-left-gap-side.md](../issues/H-datasets-lost-start-codon-left-gap-side.md), mechanism and measurements: [alignment-gap-placement-at-cds-start.md](alignment-gap-placement-at-cds-start.md)

- mpox, alignment artifacts: lost start codon warnings from deletions in `all-clades` (9), `lineage-b.1` (3) and `clade-iib` (1): the OPG204 `ATGAAG` repeat, a deletion that cuts into OPG112, and deletions next to `N` runs at OPG208. `penaltyGapEnterCds: 2` removes all of them, as [nextclade_data#482](https://github.com/nextstrain/nextclade_data/pull/482) shows [[data](https://github.com/nextstrain/nextclade_data/blob/7dc6e5bf2a02baa73b5c42f99b9489c201f0eb17/data/nextstrain/mpox/all-clades/pathogen.json#L3-L19)]. The shipped mpox datasets do not set it yet, and their trees are built with `--gap-alignment-side left` in the mpox workflows, so a change needs a tree rebuild
- Real deletions: mpox `clade-i` (a 1,141-nt deletion over OPG032), Marburg (a 1,430-nt deletion over the VP30 start in a partial sequence) and SARS-CoV-2 (a 15-nt deletion across the ORF7b end and the ORF8 start, in 5 datasets). The warning is correct, and the penalty keeps these deletions
- Substitutions at a start codon: 18 warnings in 9 datasets (CCHFV M, mpox, Andes virus, HIV-1, hMPV, measles, SARS-CoV-2, CVA16). These are changes of the start codon in the data, not alignment problems
- CVA16 and EV-A71 (`left`, no penalty): no lost VP4 start in 1,071 and 1,991 GenBank genomes, and the penalty changes nothing. Two EV-A71 genomes have a VP4 without `M`: MG367591.1 is unsequenced at the VP4 start, and JN864024.1 (an "UNVERIFIED" GenBank record) has the start codon `ACG`
- EV-D68 uses `right`. With `left`, it would lose the VP4 start next to `N` runs (3 of 1,195 GenBank genomes in an earlier check)
- dengue/all: the annotation starts C at 102, one codon after the `ATG` at 99-101, so neither the penalty nor `right` protects this start codon. Both add a false `C:N1M` in 19 of 3,000 GenBank DENV4 genomes (KY5868xx). Record: [kb/issues/N-datasets-dengue-all-c-starts-after-start-codon.md](../issues/N-datasets-dengue-all-c-starts-after-start-codon.md)
- Checked and not relevant for CVA10: only VP4 starts with `ATG` in the reference, so the lost start codon warning checks VP4 only. An in-frame deletion at the VP4 start cannot have a tied placement that removes codon 1, because the next codons are `GGG GCT`. The annotation has no reverse-strand CDS
