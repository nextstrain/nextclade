# Recombination Detection

Nextclade flags putative recombinant regions by running a two-state HMM along each query sequence after alignment and mutation calling. Intervals where mutation density relative to the inferred parent is elevated are candidate regions. Checks of the calls then keep only the candidates with strong evidence. Detection runs only for datasets that enable it.

## Provenance

The implementation follows a [Python prototype](https://github.com/mmolari/recomb_inference) [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/viterbi_recombination.py)] and its [algorithm notes](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ). The design and function contract were specified in the [Nextclade multi-reference meeting](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en) (2026-06-26) and [GitHub issue #1768](https://github.com/nextstrain/nextclade/issues/1768).

## Background

Several established method families detect recombination from sequence data:

- **Substitution and phylogenetic-incongruence scanners** such as RDP <a id="cite-4"></a>[Martin et al. 2021](https://doi.org/10.1093/ve/veaa087) [[4](#ref-4)], which identify recombination through conflicting phylogenetic signals across sliding windows
- **Exact triplet-based mosaic tests** such as 3SEQ <a id="cite-5"></a>[Boni et al. 2007](https://doi.org/10.1534/genetics.106.068874) [[5](#ref-5)], a nonparametric method for detecting mosaic structure in sequence triplets
- **Genetic-algorithm breakpoint search** such as GARD <a id="cite-6"></a>[Kosakovsky Pond et al. 2006](https://doi.org/10.1093/bioinformatics/btl474) [[6](#ref-6)]

Simulation benchmarks have assessed the relative power of these approaches <a id="cite-7"></a>[Posada and Crandall 2001](https://doi.org/10.1073/pnas.241370698) [[7](#ref-7)].

A related family of methods uses hidden Markov models that walk along a sequence and switch between "copying" states. <a id="cite-8"></a>[Li and Stephens 2003](https://doi.org/10.1093/genetics/165.4.2213) [[8](#ref-8)] introduced this for linkage-disequilibrium and recombination-rate inference, <a id="cite-9"></a>[Schultz et al. 2006](https://doi.org/10.1186/1471-2105-7-265) [[9](#ref-9)] applied it to recombinant-region calling via jumping-profile HMMs, and <a id="cite-10"></a>[Westesson and Holmes 2009](https://doi.org/10.1371/journal.pcbi.1000318) [[10](#ref-10)] extended it to whole-genome alignments. Nextclade's detector is a two-state model (wildtype vs. recombinant) relative to a single inferred parent, decoded by Viterbi. It reports interval coordinates rather than naming donor lineages, and runs per sequence during analysis.

## Model

The detector is a two-state <a id="gloss-use-1"></a>Hidden Markov Model <sup>[1](#gloss-1)</sup> [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L14-L48)] with states **wildtype** ($w$) and **recombinant** ($r$), decoded with the <a id="gloss-use-2"></a>Viterbi algorithm <sup>[2](#gloss-2)</sup>. At each reference position $l$ the model sees one of three <a id="gloss-use-3"></a>observations <sup>[3](#gloss-3)</sup> relative to the sequence's inferred parent (tree attachment point) [[src](../../packages/nextclade/src/analyze/recombination/observations.rs)]:

- `Ref`: the position matches the parent
- `Mut`: the position differs from the parent (a private substitution)
- `Missing`: the position carries no usable information -- N, deletion, ambiguity, placement-masked site, or outside the alignment

`Missing` positions emit probability 1 in both states (<a id="gloss-use-4"></a>marginalization <sup>[4](#gloss-4)</sup> over missing data) [[src](../../packages/nextclade/src/analyze/recombination/params.rs)], so they contribute no <a id="gloss-use-5"></a>emission <sup>[5](#gloss-5)</sup> evidence while still allowing <a id="gloss-use-6"></a>transitions <sup>[6](#gloss-6)</sup> and state persistence across uncovered stretches.

The joint likelihood for observation sequence $s = (s_1, \ldots, s_L)$ given hidden states $h = (h_1, \ldots, h_L)$ is [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L25-L28)]:

$$P(s \mid h) = P(h_1) \prod_{l=1}^{L} P(s_l \mid h_l) \prod_{l=1}^{L-1} T(h_{l+1} \mid h_l)$$

where $h_l \in \{w, r\}$, $P(s_l \mid h_l)$ is the emission probability, and $T$ is the transition matrix.

### Parameters

Three parameters govern the model [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/recombination_parameters.py#L5-L9)] [[src](../../packages/nextclade/src/analyze/recombination/params.rs)]:

| Parameter | Meaning                                                     | Default estimation                                           |
| --------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| $\gamma$  | $T(h_l = r \mid h_{l-1} = w) = T(h_l = w \mid h_{l-1} = r)$ | $0.01 / L_{\text{ref}}$                                      |
| $\mu_w$   | $P(s_l = 1 \mid h_l = w)$                                   | Mean terminal branch length / $L_{\text{ref}}$               |
| $\mu_r$   | $P(s_l = 1 \mid h_l = r)$                                   | Median pairwise inter-clade leaf distance / $L_{\text{ref}}$ |

where $L_{\text{ref}}$ is the reference sequence length.

#### Estimation

Parameters are resolved once per dataset at initialization from the reference tree [[src](../../packages/nextclade/src/analyze/recombination/estimate.rs)], not per sequence. The algorithm notes discuss several strategies [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L39-L48)]; the tree-based rule of thumb was adopted:

- $\mu_w$ = mean terminal branch length / $L_{\text{ref}}$: typical divergence of a newly attached sequence
- $\mu_r$ = median pairwise inter-clade leaf distance / $L_{\text{ref}}$: expected mutation density in a region from a different clade, computed via <a id="gloss-use-7"></a>MRCA <sup>[7](#gloss-7)</sup>-based path distances using per-branch mutation lists (not Auspice divergence units, which may use different scales)
- $\gamma = 0.01 / L_{\text{ref}}$: in many viral species recombinants are rare, so the expected switch rate is far below one per genome. The low rate also needs more mutations for a call and removes very short calls

Both $\mu_w$ and $\mu_r$ count true substitutions only: a branch mutation is counted only when both its reference and query bases are present (non-gap). Indels are excluded because the decoder never observes them -- deletions are routed to `Missing` and there is no insertion channel at all, so calibrating the emission rates against indels would score events the model cannot see. A deletion is also one event, not a run of per-site mutations. Branch mutations are classified structurally (a gap character in the reference or the query base) rather than by string suffix, so the substitution-only event set the observation vector uses also calibrates the rates. Malformed annotations surface as errors.

A scientific review of the first implementation (2026-11) found the mean terminal branch length for $\mu_w$ and the median inter-clade leaf distance for $\mu_r$ reasonable, on CVA16, EV-D68, SARS-CoV-2, flu H3N2 HA, RSV-A and mpox. The same review moved the default $\gamma$ from $1 / L_{\text{ref}}$ to $0.01 / L_{\text{ref}}$. The estimates are a fallback: dataset curators should freeze reviewed values in `pathogen.json` when they enable detection.

#### Transition cost and emission evidence

The transition matrix is symmetric: $T = \begin{pmatrix} 1-\gamma & \gamma \\ \gamma & 1-\gamma \end{pmatrix}$. Each state transition costs $c = \ln\!\bigl((1 - \gamma) / \gamma\bigr)$ nats in the Viterbi log-space decoder; the decoder switches state only when accumulated emission evidence exceeds $c$. Smaller $\gamma$ raises $c$, requiring denser mutation blocks to trigger a switch. The default $\gamma = 0.01 / L_{\text{ref}}$ yields $c \approx 14.9$ nats for a 30 kb genome.

Per-site emission evidence (nats are the natural-logarithm unit of information):

- `Mut`: $\ln(\mu_r / \mu_w)$ toward recombinant
- `Ref`: $\ln\!\bigl((1 - \mu_w) / (1 - \mu_r)\bigr)$ toward wildtype
- `Missing`: 0 (emission probability 1 in both states)

The interplay between $c$ and the per-site evidence determines how many mutations a block needs to trigger a recombinant call. An interior region pays two switches; a region at an edge of the sequence pays one, and a call over the whole sequence pays none, which is why the [sequence checks](#sequence-checks) exist.

#### Validation

Three invariants are enforced [[src](../../packages/nextclade/src/analyze/recombination/params.rs)]:

- All parameters in $(0, 1)$: closed endpoints produce $\log(0) = -\infty$
- $\gamma < 0.5$: at 0.5 the chain is memoryless (uniform transition matrix); above 0.5 it prefers alternation. The spec's $\gamma \ll 1/L$ [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L41)] is stricter for any real genome; $\gamma < 0.5$ is the weakest invariant preventing degenerate decoding
- $\mu_r > \mu_w$: otherwise a `Mut` observation provides zero or negative evidence for the recombinant state, making the states indistinguishable

Enforced on every construction path, including JSON deserialization (`TryFrom` on an unvalidated wire struct), so invalid instances cannot exist even across the WASM boundary.

### Viterbi decoding

The decoder works in log-space to avoid underflow on long genomes. The forward pass computes [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L84-L87)]:

$$\log V_l(k) = \log P(s_l \mid h_l = k) + \max_{k'} \left[\log V_{l-1}(k') + \log T(k \mid k')\right]$$

where $V_l(k)$ is the probability of the most likely path ending in state $k$ at position $l$. The backward pass traces pointers from $\arg\max_k V_L(k)$ back to position 1, recovering the most likely state sequence $h^*$ [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/viterbi_recombination.py#L69-L105)] [[src](../../packages/nextclade/src/analyze/recombination/decode.rs)].

## Checks of the calls

The scientific review of the first implementation ran it on the example sequences of CVA16, EV-D68, SARS-CoV-2, flu H3N2 HA, RSV-A and mpox. Most calls marked regions of high mutation density as expected; some were dubious: regions of a few tens of nucleotides next to missing runs, regions that consist mostly of `N`, and calls over the whole sequence for divergent queries and short fragments, where the all-recombinant path pays no switch cost. The review asked for calls only where the evidence is strong, at the cost of missing ambiguous cases. The checks below come from the reviewers' reimplementation of the call pipeline [[src](../../packages/nextclade/src/analyze/recombination/call_qc.rs)].

### Region checks

Applied to each decoded region after the trimming of missing ends. A missing site is a site that the decoder observes as `Missing`.

- Drop the region when the fraction of missing sites in its span is above `maxRegionMissingFraction` (default 0.5)
- Otherwise drop it when its span is below `minRegionLength` nucleotides (default 50)

### Sequence checks

Applied to the regions that pass the region checks. Either rule drops all regions of the sequence, and the sequence gets no call. The rules run in this order:

1. **Coverage**: the total span of the regions divided by the span of the alignment range is above `maxRecombinantFraction` (default 2/3). A sequence that is recombinant almost everywhere carries no localized signal
2. **Rest of the sequence**: the rest must still fit the tree. Remove the private substitutions and private deletions inside the regions, and compute the weighted total of the private-mutation QC rule on the remaining ones, with the weights of `qc.privateMutations`. The rest fails when the weighted total is at least $(\text{typical} + \text{cutoff}) \cdot L_m / L_{\text{ref}}$, where $L_m$ is the number of covered sites outside the regions (inside the alignment, not missing). This is the private-mutation score with `typical` and `cutoff` each scaled by $L_m / L_{\text{ref}}$ reaching 100, so a shorter rest gets a stricter threshold. A sequence with $L_m = 0$ gives no evidence that its rest fits the tree, and fails. Placement is not recomputed

The scaling uses the fraction of the genome ($L_m / L_{\text{ref}}$), as the review's author specified. The reviewers' script used the fraction of covered sites of the sequence instead, which is never smaller, so sequences with long missing runs can lose additional calls compared to the script. The deletions inside the regions are masked like the substitutions; the script counted all private deletion ranges of the sequence. The private-mutation weighted total comes from the QC rule's own counting [[src](../../packages/nextclade/src/qc/qc_rule_private_mutations.rs)], so the two cannot diverge.

## Pipeline integration

### Opt-in

Detection is off unless the dataset enables it with `recombination.enabled: true` in `pathogen.json` [[src](../../packages/nextclade/src/analyze/recombination/config.rs)]. The model does not fit every pathogen: in HIV, the whole genome carries a high density of private mutations, so most calls would be false. Nextclade CLI overrides the dataset in both directions with `--with-recombination` and `--without-recombination`; one function decides [[src](../../packages/nextclade/src/analyze/recombination/config.rs)]. Nextclade Web has no user switch. Whether a dataset should be able to forbid detection, and whether Web gets a switch, is open: `kb/issues/M-recombination-user-opt-in.md`.

When detection is on, the dataset setup runs once at `Nextclade::new` [[src](../../packages/nextclade/src/analyze/recombination/setup.rs)], and every reason that blocks detection fails the dataset load with an error that names the cause:

- no reference tree, so there are no parent-relative mutations to observe
- an invalid setting: an HMM parameter outside $(0, 1)$, $\gamma \geq 0.5$, both $\mu_w$ and $\mu_r$ given with $\mu_r \leq \mu_w$, or a fraction outside $[0, 1]$
- a parameter that the tree cannot estimate: fewer than two leaf clades for $\mu_r$, no per-branch nucleotide mutations, another degenerate topology, or estimates with $\mu_r \leq \mu_w$
- an absent or disabled `qc.privateMutations` rule, which the rest-of-sequence check needs

There is no silent skip: a curator who enables detection learns at load time why it cannot run.

### Per sequence

Detection runs per sequence in the parallel phase, after private mutation calling [[src](../../packages/nextclade/src/run/nextclade_run_one.rs)] [[src](../../packages/nextclade/src/analyze/recombination/run.rs)]. A sequence without private substitutions is skipped: every site is `Ref` or `Missing`, and the recombinant state cannot outscore the wildtype state, so the skip is exact. For the other sequences:

1. Assemble non-comparable positions (N, deletions, ambiguities, placement-masked sites) and build the observation vector; mutations are applied first, then non-comparable ranges override them to `Missing` (missing data must not contribute to the likelihood)
2. Viterbi-decode with uniform prior and symmetric transitions
3. Collect maximal runs of the recombinant state as half-open ranges, and trim leading and trailing `Missing` from each
4. Apply the [region checks](#region-checks), then the [sequence checks](#sequence-checks)

## Configuration

All settings sit in the `recombination` object of `pathogen.json`. Values for SARS-CoV-2:

```json
"recombination": {
  "enabled": true,
  "gamma": 3.3e-7,
  "muW": 0.00017,
  "muR": 0.0061,
  "minRegionLength": 50,
  "maxRegionMissingFraction": 0.5,
  "maxRecombinantFraction": 0.667
}
```

`enabled` defaults to `false`. `minRegionLength`, `maxRegionMissingFraction` and `maxRecombinantFraction` are optional, with the defaults above. Whether each setting gets a CLI flag is open: `kb/issues/N-recombination-cli-parameter-flags.md`.

### Overrides

Each HMM parameter resolves independently: explicit `pathogen.json` values are validated and used verbatim; only unset parameters are estimated. A dataset supplying all three never invokes the estimator, so a degenerate tree cannot block loading.

### Freezing parameters into a dataset (data repository)

The run-time estimate recomputes the parameters from whatever reference tree a dataset ships. A dataset can instead carry frozen, reviewed values as explicit `pathogen.json` overrides, so that the model a reviewer signed off on is not silently shifted by a later tree update. The [`nextclade_data`](https://github.com/nextstrain/nextclade_data) repository provides `scripts/recombination_params` for computing them, a Python mirror of the Rust estimator that must produce identical values.

- Inputs: `--input-tree` (Auspice `tree.json`) and `--input-ref` (`reference.fasta`), plus an optional `--pathogen`.
- With `--pathogen`, the three estimates are written into that file's `recombination` object in place; without it, the parameters are printed as JSON to stdout for inspection. The script writes only `gamma`, `muW` and `muR`, never `enabled`, so freezing parameters does not switch detection on.

The helper mirrors the Rust estimator exactly: the same `gamma` default, true substitutions only (both reference and query bases present, so neither insertions nor deletions count), leaf-only clade grouping, median pairwise inter-clade **leaf-to-leaf** distance, and strict validation of branch-mutation tokens. Freezing all three bypasses the run-time estimator entirely (see [Overrides](#overrides)). Parity is guarded by tests in `nextclade_data` `tests/test_recombination_params.py` that use the Rust unit-test fixtures as the oracle.

## Output

Recombination is an observation about sequence origin, not a quality metric, so results go into dedicated output fields rather than the QC system. The structured per-region data (coordinates, lengths) does not fit the scalar QC score model ([design meeting](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1)).

When detection is off for a dataset, the outputs carry no recombination fields: no `recombination` object per sequence, no `recombinationParams` in `nextclade.json`, no `recombination.*` columns, and no column or markers in Nextclade Web. A sequence whose calls the checks drop has no `recombination` object and empty columns.

### Data model

`RecombinationResult` [[src](../../packages/nextclade/src/analyze/recombination/result.rs)]:

- `regions`: non-empty list of `RecombinationRegion`
- `totalRegions`: number of regions
- `totalLength`: sum of region lengths in nucleotides
- `longestRegion`: the `RecombinationRegion` with the greatest length

`RecombinationRegion`:

- `range`: half-open interval in reference coordinates
- `length`: nucleotide span

`RecombinationResult::from_ranges()` returns `Option<Self>`: `None` when no region passes the checks.

### CSV/TSV columns

Recombination columns belong to a dedicated `Recombination` category (selectable via `--output-columns-selection recombination`), present only for datasets that run detection [[src](../../packages/nextclade/src/io/nextclade_csv.rs)]:

- `recombination.regions`: comma-delimited list of `begin-end` ranges (1-based closed)
- `recombination.totalRegions`: number of regions
- `recombination.totalLength`: total nucleotide length of all regions
- `recombination.longestRegion.range`: range of the longest region
- `recombination.longestRegion.length`: nucleotide length of the longest region

### JSON output

The `recombination` field of the per-sequence result object is omitted when `None`. When present:

```json
{
  "regions": [{ "range": { "begin": 100, "end": 200 }, "length": 100 }],
  "totalRegions": 1,
  "totalLength": 100,
  "longestRegion": { "range": { "begin": 100, "end": 200 }, "length": 100 }
}
```

The effective HMM parameters are reported once at the top level of `nextclade.json` as `recombinationParams`.

### Viewer

Recombinant intervals appear as purple rectangles in the sequence view per the [design meeting](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1):

- Color: purple (`#8f2fd4` fill, `#e0b3ff` border), distinct from mutation and QC markers
- Tooltip: range and length
- Shown in all nucleotide views with fixed reference coordinates (identical rendering regardless of "Relative to" selection). Markers count toward the per-view display threshold
- No gene labels (intervals span multiple genes) or `Missing` annotations (handled by [interval trimming](#interval-trimming))

For datasets that run detection, the results table includes a "Rec." column (placed after clade columns) showing total recombinant length:

- Cell tooltip: region count, total length with genome percentage, longest region with range/length/percentage, and a region list (capped at 20)
- Sortable by total recombinant length; sequences without recombination results sort to the bottom

## Differences from spec

### Three-valued observations

The observation model uses three values (`Ref`, `Mut`, `Missing`) rather than binary $\{0, 1\}$ [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/viterbi_recombination.py#L17)]. A `Missing` observation emits with probability 1 in both states, covering two categories of positions that carry no usable evidence [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L89-L95)]:

- **N characters**: no emission evidence, but transitions still cross N runs, so a recombinant region bridging an N stretch is not split into two
- **Deletions**: a large deletion is one mutational event, not a cluster of per-site mutations; counting each deleted position as `Mut` would inflate local mutation density and trigger false calls

The observation vector layers three sources: alignment range (covered = `Ref`), private substitutions (`Mut`), then non-comparable ranges (`Missing`). The last step is final: a non-comparable position stays `Missing` even if a mutation also maps to it, because missing data must not contribute to the likelihood.

### Placement-masked sites

Placement-masked positions are treated as `Missing`. Without this, a masked site that differs from the parent would be scored as `Mut`, which could produce a false recombinant call at a <a id="gloss-use-8"></a>homoplasic <sup>[8](#gloss-8)</sup> site. Not addressed in the meeting spec.

### Interval trimming

Leading and trailing `Missing` positions are trimmed from each decoded interval [[src](../../packages/nextclade/src/analyze/recombination/decode.rs)]. Internal `Missing` stretches remain bridged. An interval with no covered positions is dropped entirely. Required by the [meeting spec](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1): "we do not want leading/trailing deletion range annotations".

### No confidence score

The decoded intervals carry no confidence score. Forward-backward posterior marginals were considered as a per-region confidence, but the [checks of the calls](#checks-of-the-calls) are the agreed evidence filter, and a second, uncalibrated number next to each call would invite thresholds that nobody validated.

### Parameter validation

Three invariants beyond the prototype's $[0, 1]$ range check; see [Validation](#validation).

## Deferred

Deliberately postponed. Numbered for stable references.

### 1. Per-segment placement after a breakpoint

After detecting a breakpoint, should Nextclade split the sequence and place each segment independently? ([design meeting](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1))

No. The current implementation detects and reports intervals. Three alternatives were discussed and deferred:

- Split the sequence at breakpoints and run separate tree placements
- Mask recombinant regions and re-run the pipeline, including placement of the flagged regions on the tree after masking
- Assign clades per gene (e.g. VP1 and 3D for Enteroviruses, whose evolution is shaped by frequent inter-serotype recombination <a id="cite-11"></a>[Simmonds 2006](https://doi.org/10.1128/jvi.01076-06) [[11](#ref-11)])

Downstream consumers can mask and re-run if needed.

### 2. Reversions

A reversion is stronger evidence of recombination than other private mutations. The model treats all private substitutions alike.

### 3. Variable transition rate

A `gamma` that varies along the genome, for viruses with known recombination hot and cold spots.

## Glossary

1. <a id="gloss-1"></a> **Hidden Markov Model (HMM).** A probabilistic model with unobserved (hidden) states that emit observable symbols. The hidden state sequence is inferred from observations using dynamic programming. Introduced for statistical applications by <a id="cite-1"></a>[Baum et al. 1970](https://doi.org/10.1214/aoms/1177697196) [[1](#ref-1)]; canonical tutorial in <a id="cite-2a"></a>[Rabiner 1989](https://doi.org/10.1109/5.18626) [[2](#ref-2)]. [↩](#gloss-use-1)
2. <a id="gloss-2"></a> **Viterbi algorithm.** A dynamic programming algorithm that finds the most likely sequence of hidden states in an HMM, operating in $O(L \cdot K^2)$ time where $L$ is the sequence length and $K$ is the number of states. Introduced in <a id="cite-3"></a>[Viterbi 1967](https://doi.org/10.1109/TIT.1967.1054010) [[3](#ref-3)] for decoding convolutional codes; later adopted for HMM decoding. [↩](#gloss-use-2)
3. <a id="gloss-3"></a> **Observation (emission).** The visible output $s_l$ at position $l$, generated by the hidden state $h_l$ according to the emission probability $P(s_l \mid h_l)$. In this model: `Ref`, `Mut`, or `Missing`. [↩](#gloss-use-3)
4. <a id="gloss-4"></a> **Marginalization.** Summing (or in log-space, log-sum-exp-ing) over all possible values of an unobserved variable to eliminate it from a probability expression. For `Missing` observations, $P(s_l \mid h_l) = 1$ (uniform over emissions), so the position contributes no evidence to state discrimination. [↩](#gloss-use-4)
5. <a id="gloss-5"></a> **Emission probability.** $P(s_l \mid h_l = k)$: the probability of observing $s_l$ given hidden state $k$. In this model, $P(s_l = 1 \mid h_l = w) = \mu_w$ and $P(s_l = 1 \mid h_l = r) = \mu_r$. [↩](#gloss-use-5)
6. <a id="gloss-6"></a> **Transition probability.** $T(h_l = k' \mid h_{l-1} = k)$: the probability of moving from state $k$ to state $k'$ between adjacent positions. Symmetric in this model: $T(r \mid w) = T(w \mid r) = \gamma$, $T(w \mid w) = T(r \mid r) = 1 - \gamma$. [↩](#gloss-use-6)
7. <a id="gloss-7"></a> **MRCA (Most Recent Common Ancestor).** The deepest node in a phylogenetic tree that is an ancestor of two given leaves. Used here to compute pairwise inter-clade distances for estimating $\mu_r$: $d(a, b) = d_{\text{root}}(a) + d_{\text{root}}(b) - 2 \cdot d_{\text{root}}(\text{MRCA}(a, b))$ [[src](../../packages/nextclade/src/analyze/recombination/estimate.rs)]. [↩](#gloss-use-7)
8. <a id="gloss-8"></a> **Homoplasy (homoplasic site).** A character state shared by taxa but not inherited from a common ancestor, arising from convergent or parallel mutation or reversion rather than shared descent. A homoplasic site is a genome position where the same substitution recurs independently on separate lineages, so a match to the parent there is weak evidence of shared ancestry. [↩](#gloss-use-8)

## References

1. <a id="ref-1"></a> Baum, Leonard E., Ted Petrie, George W. Soules, and Norman Weiss. 1970. "A Maximization Technique Occurring in the Statistical Analysis of Probabilistic Functions of Markov Chains." _The Annals of Mathematical Statistics_ 41(1):164-171. https://doi.org/10.1214/aoms/1177697196 [↩](#cite-1)
2. <a id="ref-2"></a> Rabiner, Lawrence R. 1989. "A Tutorial on Hidden Markov Models and Selected Applications in Speech Recognition." _Proceedings of the IEEE_ 77(2):257-286. https://doi.org/10.1109/5.18626 [↩](#cite-2a)
3. <a id="ref-3"></a> Viterbi, Andrew J. 1967. "Error Bounds for Convolutional Codes and an Asymptotically Optimum Decoding Algorithm." _IEEE Transactions on Information Theory_ 13(2):260-269. https://doi.org/10.1109/TIT.1967.1054010 [↩](#cite-3)
4. <a id="ref-4"></a> Martin, Darren P., Arvind Varsani, Philippe Roumagnac, et al. 2021. "RDP5: A Computer Program for Analyzing Recombination in, and Removing Signals of Recombination from, Nucleotide Sequence Datasets." _Virus Evolution_ 7(1):veaa087. https://doi.org/10.1093/ve/veaa087 [↩](#cite-4)
5. <a id="ref-5"></a> Boni, Maciej F., David Posada, and Marcus W. Feldman. 2007. "An Exact Nonparametric Method for Inferring Mosaic Structure in Sequence Triplets." _Genetics_ 176(2):1035-1047. https://doi.org/10.1534/genetics.106.068874 [↩](#cite-5)
6. <a id="ref-6"></a> Kosakovsky Pond, Sergei L., David Posada, Michael B. Gravenor, Christopher H. Woelk, and Simon D. W. Frost. 2006. "GARD: A Genetic Algorithm for Recombination Detection." _Bioinformatics_ 22(24):3096-3098. https://doi.org/10.1093/bioinformatics/btl474 [↩](#cite-6)
7. <a id="ref-7"></a> Posada, David, and Keith A. Crandall. 2001. "Evaluation of Methods for Detecting Recombination from DNA Sequences: Computer Simulations." _Proceedings of the National Academy of Sciences_ 98(24):13757-13762. https://doi.org/10.1073/pnas.241370698 [↩](#cite-7)
8. <a id="ref-8"></a> Li, Na, and Matthew Stephens. 2003. "Modeling Linkage Disequilibrium and Identifying Recombination Hotspots Using Single-Nucleotide Polymorphism Data." _Genetics_ 165(4):2213-2233. https://doi.org/10.1093/genetics/165.4.2213 [↩](#cite-8)
9. <a id="ref-9"></a> Schultz, Anne-Kathrin, Ming Zhang, Thomas Leitner, et al. 2006. "A Jumping Profile Hidden Markov Model and Applications to Recombination Sites in HIV and HCV Genomes." _BMC Bioinformatics_ 7:265. https://doi.org/10.1186/1471-2105-7-265 [↩](#cite-9)
10. <a id="ref-10"></a> Westesson, Oscar, and Ian Holmes. 2009. "Accurate Detection of Recombinant Breakpoints in Whole-Genome Alignments." _PLoS Computational Biology_ 5(3):e1000318. https://doi.org/10.1371/journal.pcbi.1000318 [↩](#cite-10)
11. <a id="ref-11"></a> Simmonds, Peter. 2006. "Recombination and Selection in the Evolution of Picornaviruses and Other Mammalian Positive-Stranded RNA Viruses." _Journal of Virology_ 80(22):11124-11140. https://doi.org/10.1128/jvi.01076-06 [↩](#cite-11)
