# Recombination Detection

Nextclade flags putative recombinant regions by running a two-state HMM along each query sequence after alignment and mutation calling. Intervals where mutation density relative to the inferred parent is elevated are reported as putative recombinant regions.

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

The detector is a two-state <a id="gloss-use-1"></a>Hidden Markov Model <sup>[1](#gloss-1)</sup> [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L14-L48)] with states **wildtype** ($w$) and **recombinant** ($r$), decoded with the <a id="gloss-use-2"></a>Viterbi algorithm <sup>[2](#gloss-2)</sup>. At each reference position $l$ the model sees one of three <a id="gloss-use-3"></a>observations <sup>[3](#gloss-3)</sup> relative to the sequence's inferred parent (tree attachment point):

- `Ref`: the position matches the parent
- `Mut`: the position differs from the parent (a private substitution)
- `Missing`: the position carries no usable information -- N, deletion, ambiguity, placement-masked site, or outside the alignment

`Missing` positions emit probability 1 in both states (<a id="gloss-use-4"></a>marginalization <sup>[4](#gloss-4)</sup> over missing data) [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L271-L278)], so they contribute no <a id="gloss-use-5"></a>emission <sup>[5](#gloss-5)</sup> evidence while still allowing <a id="gloss-use-6"></a>transitions <sup>[6](#gloss-6)</sup> and state persistence across uncovered stretches.

The joint likelihood for observation sequence $s = (s_1, \ldots, s_L)$ given hidden states $h = (h_1, \ldots, h_L)$ is [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L25-L28)]:

$$P(s \mid h) = P(h_1) \prod_{l=1}^{L} P(s_l \mid h_l) \prod_{l=1}^{L-1} T(h_{l+1} \mid h_l)$$

where $h_l \in \{w, r\}$, $P(s_l \mid h_l)$ is the emission probability, and $T$ is the transition matrix.

### Parameters

Three parameters govern the model [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/recombination_parameters.py#L5-L9)] [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L184-L191)]:

| Parameter | Meaning                                                     | Default estimation                                           |
| --------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| $\gamma$  | $T(h_l = r \mid h_{l-1} = w) = T(h_l = w \mid h_{l-1} = r)$ | $1 / L_{\text{ref}}$                                         |
| $\mu_w$   | $P(s_l = 1 \mid h_l = w)$                                   | Mean terminal branch length / $L_{\text{ref}}$               |
| $\mu_r$   | $P(s_l = 1 \mid h_l = r)$                                   | Median pairwise inter-clade leaf distance / $L_{\text{ref}}$ |

where $L_{\text{ref}}$ is the reference sequence length.

#### Estimation

Parameters are resolved once per dataset at initialization from the reference tree [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L37-L91)], not per sequence. The algorithm notes discuss several strategies [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L39-L48)]; the tree-based rule of thumb was adopted:

- $\mu_w$ = mean terminal branch length / $L_{\text{ref}}$ [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L188-L202)]: typical divergence of a newly attached sequence
- $\mu_r$ = median pairwise inter-clade leaf distance / $L_{\text{ref}}$ [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L204-L249)]: expected mutation density in a region from a different clade, computed via <a id="gloss-use-8"></a>MRCA <sup>[8](#gloss-8)</sup>-based path distances using per-branch mutation lists (not Auspice divergence units, which may use different scales)
- $\gamma = 1 / L_{\text{ref}}$ [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L183-L186)]: one expected state switch per genome, so the model only switches when emission evidence is strong

Both $\mu_w$ and $\mu_r$ count substitutions only. Deletions are excluded from per-branch mutation counts because a deletion is a single event treated as missing, not a run of per-site mutations. Insertions remain counted. Branch mutations are parsed structurally -- a token whose query base is a gap is a deletion -- rather than by string suffix, so the same rule that routes deletions to `Missing` in the observation vector also calibrates the rates; a malformed tree annotation surfaces as an error rather than being silently miscounted [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L251-L274)].

#### Transition cost and emission evidence

The transition matrix is symmetric: $T = \begin{pmatrix} 1-\gamma & \gamma \\ \gamma & 1-\gamma \end{pmatrix}$. Each state transition costs $c = \ln\!\bigl((1 - \gamma) / \gamma\bigr)$ nats in the Viterbi log-space decoder; the decoder switches state only when accumulated emission evidence exceeds $c$. Smaller $\gamma$ raises $c$, requiring denser mutation blocks to trigger a switch. The default $\gamma = 1 / L_{\text{ref}}$ yields $c \approx 10.3$ nats for a 30 kb genome.

Per-site emission evidence (nats are the natural-logarithm unit of information):

- `Mut`: $\ln(\mu_r / \mu_w)$ toward recombinant
- `Ref`: $\ln\!\bigl((1 - \mu_w) / (1 - \mu_r)\bigr)$ toward wildtype
- `Missing`: 0 (emission probability 1 in both states)

The interplay between $c$ and the per-site evidence determines how many mutations a block needs to trigger a recombinant call.

#### Validation

Three invariants are enforced [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L248-L268)]:

- All parameters in $(0, 1)$: closed endpoints produce $\log(0) = -\infty$
- $\gamma < 0.5$: at 0.5 the chain is memoryless (uniform transition matrix); above 0.5 it prefers alternation. The spec's $\gamma \ll 1/L$ [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L41)] is stricter for any real genome; $\gamma < 0.5$ is the weakest invariant preventing degenerate decoding
- $\mu_r > \mu_w$: otherwise a `Mut` observation provides zero or negative evidence for the recombinant state, making the states indistinguishable

These invariants hold on every construction path. Besides the validating constructor, JSON deserialization enforces them: `RecombinationHmmParams` deserializes through an unvalidated wire struct and a `TryFrom` conversion [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L182-L209)], so an invalid instance cannot arise even when the type is read back at the WASM boundary.

### Viterbi decoding

The decoder works in log-space to avoid underflow on long genomes. The forward pass computes [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L84-L87)]:

$$\log V_l(k) = \log P(s_l \mid h_l = k) + \max_{k'} \left[\log V_{l-1}(k') + \log T(k \mid k')\right]$$

where $V_l(k)$ is the probability of the most likely path ending in state $k$ at position $l$. The backward pass traces pointers from $\arg\max_k V_L(k)$ back to position 1, recovering the most likely state sequence $h^*$ [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/viterbi_recombination.py#L69-L105)] [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L508-L565)].

### Forward-backward scoring

After Viterbi identifies recombinant intervals, the <a id="gloss-use-7"></a>forward-backward <sup>[7](#gloss-7)</sup> algorithm [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L97-L202)] computes per-site posterior marginals $P(h_l = r \mid s)$ in log-space over the same observation vector and parameters. These marginals are the basis of posterior (maximum-posterior-marginal) decoding <a id="cite-12"></a>[Durbin et al. 1998](https://doi.org/10.1017/CBO9780511790492) [[12](#ref-12)], which scores each position by its probability summed over all state paths, rather than committing to the single most-probable path Viterbi returns. The forward messages are [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L110-L130)]:

$$\log \alpha_{l}(k) = \log P(s_l \mid h_l = k) + \text{log-sum-exp}_{k'} \left[\log \alpha_{l-1}(k') + \log T(k \mid k')\right]$$

and the backward messages are [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L137-L155)]:

$$\log \beta_{l}(k) = \text{log-sum-exp}_{k'} \left[\log T(k' \mid k) + \log P(s_{l+1} \mid h_{l+1} = k') + \log \beta_{l+1}(k')\right]$$

The per-site marginal is $P(h_l = r \mid s) = \exp\!\bigl(\log \alpha_l(r) + \log \beta_l(r) - \log Z\bigr)$ where $\log Z = \text{log-sum-exp}_k\!\bigl(\log \alpha_l(k) + \log \beta_l(k)\bigr)$ [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L160-L175)] [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L434-L489)].

Each Viterbi-decoded interval receives a confidence score equal to the mean posterior marginal within it [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L492-L505)]. The score is bounded in $[0, 1]$: values near 1 indicate high posterior certainty the interval is recombinant; values near 0.5 indicate ambiguous evidence. This is the per-call reliability measure natural to an HMM -- certainty aggregated over all paths -- which Viterbi's single hard state assignment cannot express.

## Pipeline integration

Recombination detection runs per-sequence in the parallel phase, after private mutation calling [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/run/nextclade_run_one.rs#L442-L467)]. It is first gated on the private-substitution count: a sequence below `minPrivateSubsToRun` is skipped without assembling an observation vector [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/run/nextclade_run_one.rs#L447-L451)]. For a sequence that passes the gate, the steps are:

1. `fn recombination_missing_ranges()`: assemble non-comparable positions (N, deletions, ambiguities, placement-masked sites) [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L106-L119)]
2. `fn build_observations()`: construct the observation vector; mutations are applied first, then non-comparable ranges override them to `Missing` (missing data must not contribute to the likelihood) [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L128-L171)]
3. `fn viterbi_decode()`: log-space Viterbi with uniform prior and symmetric transitions [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L508-L565)]
4. `fn extract_recombinant_intervals()`: collect maximal runs of the recombinant state as half-open ranges [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L568-L591)]
5. `fn trim_intervals_to_covered()`: trim leading/trailing `Missing` from interval endpoints [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L74-L85)]
6. `fn forward_backward_marginals()`: run the forward-backward algorithm over the same observation vector to obtain per-site $P(\text{recombinant} \mid s)$; skipped when no regions were found (steps 3--5 returned empty) [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L434-L489)]
7. `fn compute_interval_confidences()`: mean posterior marginal within each interval, yielding one confidence score per region [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L492-L505)]

## Configuration

### Overrides

Each parameter resolves independently [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L37-L91)]: an explicit `pathogen.json` value is validated [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L147-L155)] and used verbatim, and the corresponding tree estimate is not computed at all; only unset parameters are estimated. An out-of-range explicit override is a dataset-level error. Because the estimate is reached only in the unset arm, a dataset that supplies all three parameters explicitly never invokes the estimator, so a difficult or degenerate tree cannot make such a dataset fail to load. When a parameter is unset and its estimate is undefined (e.g. fewer than two clades for $\mu_r$), detection is skipped; see [Enable/disable](#enabledisable) for how that skip surfaces.

### Freezing parameters into a dataset (data repository)

The run-time estimate above recomputes the parameters from whatever reference tree a dataset ships. A dataset can instead carry frozen, reviewed values as explicit `pathogen.json` overrides, so that the model a reviewer signed off on is not silently shifted by a later tree update. The [`nextclade_data`](https://github.com/nextstrain/nextclade_data) repository provides `scripts/recombination_params` for computing them, a Python mirror of the Rust estimator that must produce identical values.

- Inputs: `--input-tree` (Auspice `tree.json`) and `--input-ref` (`reference.fasta`), plus an optional `--pathogen`.
- With `--pathogen`, the three estimates are written into that file's `recombination` object in place, preserving any existing `enabled` decision and otherwise defaulting it on; without it, the parameters are printed as JSON to stdout for inspection.

The helper reproduces the authoritative definitions exactly, including the details that calibrate the rates: it counts substitutions and insertions but excludes deletions (query-base gaps) from per-branch mutation counts, groups clades by leaves only, computes $\mu_r$ as the median pairwise inter-clade **leaf-to-leaf** distance (not a founder-to-founder distance), and errors on a malformed branch-mutation token rather than miscounting it. Because a frozen value becomes an explicit override, a dataset that freezes all three never invokes the run-time estimator (see [Overrides](#overrides)). Parity is not assumed: it is guarded by tests that transcribe the Rust unit-test fixtures (`packages/nextclade/src/analyze/recombination_estimate.rs`) as the oracle, in `nextclade_data` `tests/test_recombination_params.py`.

### Minimum private substitutions to run

The optional `minPrivateSubsToRun` field gates detection per sequence: a sequence carrying fewer than this many private substitutions is skipped entirely -- neither Viterbi nor forward-backward runs, and the sequence receives no `recombination` result [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L375-L421)]. It defaults to 1. A sequence with zero private substitutions has an all-`Ref`/`Missing` observation vector, so the recombinant state can never outscore wildtype and the decoded result is provably empty; the default therefore skips only sequences that carry no recombinant signal at all, making it an exact optimization rather than a heuristic. Raising the threshold above 1 trades sensitivity for throughput and is a per-dataset choice.

### Enable/disable

Detection is on by default. The `enabled` field of the `recombination` config object in `pathogen.json` is optional and tri-state: absent (or an absent config object) means default-on, `true` is an explicit opt-in, and `false` disables detection [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L403-L414)].

A dataset **cannot support** detection when any of the following holds. These are enumerated by the `RecombinationSkipReason` enum [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L104-L144)], each carrying an actionable, human-readable message:

- `NoReferenceTree`: no reference tree, so there are no parent-relative mutations to observe
- `FewerThanTwoClades`: fewer than two leaf clades, so inter-clade divergence ($\mu_r$) is undefined
- `NoBranchMutations`: no per-branch nucleotide mutations, so the divergence rates that calibrate the model cannot be estimated
- `TreeEstimateUnavailable`: a required estimate is undefined for some other degenerate topology
- `RecombinantRateNotElevated`: a degenerate estimate with $\mu_r \leq \mu_w$, leaving the two states indistinguishable

The outcome when a dataset cannot support detection is decided once, at `Nextclade::new`, and depends on how detection was requested [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/run/nextclade_wasm.rs#L409-L444)]:

- **Default-on** (`enabled` absent): silently skipped, like any other tree-dependent step whose inputs are missing
- **Explicit `enabled: true`**: a dataset-level error at load, whose message names the cause and advises the author to provide the missing input, set the parameters explicitly, or remove `recombination.enabled`. An explicit request that cannot be honored fails loudly rather than silently emitting nothing

Invalid explicit parameters are a dataset-level error regardless of `enabled`: any of the three outside the open interval $(0, 1)$ [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L147-L155)], $\gamma \geq 0.5$, or both $\mu_w$ and $\mu_r$ supplied with $\mu_r \leq \mu_w$ [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L73-L83)].

## Output

Recombination is an observation about sequence origin, not a quality metric, so results go into dedicated output columns rather than the QC system. The structured per-region data (coordinates, lengths) does not fit the scalar QC score model ([design meeting](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1)).

### Data model

`RecombinationResult`:

- `regions`: non-empty list of `RecombinationRegion`
- `totalRegions`: number of regions
- `totalLength`: sum of region lengths in nucleotides
- `longestRegion`: the `RecombinationRegion` with the greatest length

`RecombinationRegion`:

- `range`: half-open interval in reference coordinates
- `length`: nucleotide span
- `confidence: Option<f64>`: mean posterior $P(\text{recombinant} \mid s)$ within the interval

`RecombinationResult::from_ranges()` returns `Option<Self>`: `None` when no recombinant intervals are found, collapsing "ran, found nothing" into the same representation as "didn't run".

### CSV/TSV columns

Recombination columns belong to a dedicated `Recombination` category (selectable via `--output-columns-selection recombination`), all visible by default:

- `recombination.regions`: comma-delimited list of `begin-end` ranges (1-based closed)
- `recombination.regionConfidences`: comma-delimited confidence scores per region (3 decimal places); empty when forward-backward did not run
- `recombination.totalRegions`: number of regions
- `recombination.totalLength`: total nucleotide length of all regions
- `recombination.longestRegion.range`: range of the longest region
- `recombination.longestRegion.length`: nucleotide length of the longest region

### JSON output

The `recombination` field of the per-sequence result object is omitted when `None`. When present:

```json
{
  "regions": [{ "range": { "begin": 100, "end": 200 }, "length": 100, "confidence": 0.95 }],
  "totalRegions": 1,
  "totalLength": 100,
  "longestRegion": { "range": { "begin": 100, "end": 200 }, "length": 100, "confidence": 0.95 }
}
```

`confidence` is present on each region when forward-backward has run. Currently forward-backward runs unconditionally for non-empty region sets, so in practice the field is always present.

### Viewer

Recombinant intervals appear as purple rectangles in the sequence view per the [design meeting](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1):

- Color: purple (`#8f2fd4` fill, `#e0b3ff` border), distinct from mutation and QC markers
- Confidence visualization: higher confidence produces more opaque fill and border (minimum fill opacity 0.35, minimum border opacity 0.5). When confidence is unavailable, markers render at full opacity
- Tooltip: "Putative recombinant" with nucleotide range, length, and confidence percentage (when available)
- Shown in all nucleotide views. The intervals use fixed reference coordinates, so they render identically in the absolute (Reference) view and the relative views (parent, clade founder, custom node) regardless of the "Relative to" selection. Markers count toward the per-view display threshold and are suppressed when it is exceeded
- No gene or codon labels: recombinant intervals can span multiple genes, so per-gene labels would be misleading
- No leading/trailing `Missing` annotations: handled by [interval trimming](#interval-trimming)

The results table includes a "Rec." column (placed after clade columns) showing total recombinant length:

- Cell tooltip: region count, total length with genome percentage, longest region with range/length/percentage, and a region list (capped at 20) with each region's confidence
- Sortable by total recombinant length; sequences without recombination results sort to the bottom

## Differences from spec

### Three-valued observations

The observation model uses three values (`Ref`, `Mut`, `Missing`) rather than binary $\{0, 1\}$ [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/viterbi_recombination.py#L17)]. A `Missing` observation [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L88-L97)] emits with probability 1 in both states, covering two categories of positions that carry no usable evidence [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L89-L95)]:

- **N characters**: no emission evidence, but transitions still cross N runs, so a recombinant region bridging an N stretch is not split into two
- **Deletions**: a large deletion is one mutational event, not a cluster of per-site mutations; counting each deleted position as `Mut` would inflate local mutation density and trigger false calls

`fn build_observations()` [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L128-L171)] layers three sources: alignment range (covered = `Ref`), private substitutions (`Mut`), then non-comparable ranges (`Missing`). The last step is final: a non-comparable position stays `Missing` even if a mutation also maps to it, because missing data must not contribute to the likelihood.

### Placement-masked sites

Placement-masked positions are treated as `Missing` [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/run/nextclade_run_one.rs#L433-L440)]. Without this, a masked site that differs from the parent would be scored as `Mut`, which could produce a false recombinant call at a <a id="gloss-use-9"></a>homoplasic <sup>[9](#gloss-9)</sup> site. Not addressed in the meeting spec.

### Interval trimming

Leading and trailing `Missing` positions are trimmed from each decoded interval [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination.rs#L74-L85)]. Internal `Missing` stretches remain bridged. An interval with no covered positions is dropped entirely. Required by the [meeting spec](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1): "we do not want leading/trailing deletion range annotations".

### Forward-backward confidence

Forward-backward [[prototype](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/code/recomb_inference/forward_backward.py#L115-L192)] [[spec](https://github.com/mmolari/recomb_inference/blob/944ec48a93a1/notes/n01_algorithm.typ#L97-L202)] runs conditionally: only when Viterbi finds at least one recombinant region. When the decoded state sequence is entirely wildtype, forward-backward is skipped and confidence fields are `None`, avoiding the $O(L)$ memory cost of two full message arrays ($\alpha$ and $\beta$) for the common case. Per-site marginals are not surfaced in output -- only the per-interval mean is stored on each `RecombinationRegion`.

### Parameter validation

Three invariants beyond the prototype's $[0, 1]$ range check; see [Validation](#validation).

## Deferred

Design questions raised and deliberately postponed. Each is numbered so later deferrals can be appended without renumbering the earlier ones.

### 1. Per-segment placement after a breakpoint

After detecting a breakpoint, should Nextclade split the sequence and place each segment independently? ([design meeting](https://docs.google.com/document/d/1EGIaSpCdSfgnPO0m4h9_OweGnw8wSGCio3ATK-xfof8?hl=en#heading=h.yh3vb8at25y1))

No. The current implementation detects and reports intervals. Three alternatives were discussed and deferred:

- Split the sequence at breakpoints and run separate tree placements
- Mask recombinant regions and re-run the pipeline
- Assign clades per gene (e.g. VP1 and 3D for Enteroviruses, whose evolution is shaped by frequent inter-serotype recombination <a id="cite-11"></a>[Simmonds 2006](https://doi.org/10.1128/jvi.01076-06) [[11](#ref-11)])

Downstream consumers can mask and re-run if needed.

## Glossary

1. <a id="gloss-1"></a> **Hidden Markov Model (HMM).** A probabilistic model with unobserved (hidden) states that emit observable symbols. The hidden state sequence is inferred from observations using dynamic programming. Introduced for statistical applications by <a id="cite-1"></a>[Baum et al. 1970](https://doi.org/10.1214/aoms/1177697196) [[1](#ref-1)]; canonical tutorial in <a id="cite-2a"></a>[Rabiner 1989](https://doi.org/10.1109/5.18626) [[2](#ref-2)]. [↩](#gloss-use-1)
2. <a id="gloss-2"></a> **Viterbi algorithm.** A dynamic programming algorithm that finds the most likely sequence of hidden states in an HMM, operating in $O(L \cdot K^2)$ time where $L$ is the sequence length and $K$ is the number of states. Introduced in <a id="cite-3"></a>[Viterbi 1967](https://doi.org/10.1109/TIT.1967.1054010) [[3](#ref-3)] for decoding convolutional codes; later adopted for HMM decoding. [↩](#gloss-use-2)
3. <a id="gloss-3"></a> **Observation (emission).** The visible output $s_l$ at position $l$, generated by the hidden state $h_l$ according to the emission probability $P(s_l \mid h_l)$. In this model: `Ref`, `Mut`, or `Missing`. [↩](#gloss-use-3)
4. <a id="gloss-4"></a> **Marginalization.** Summing (or in log-space, log-sum-exp-ing) over all possible values of an unobserved variable to eliminate it from a probability expression. For `Missing` observations, $P(s_l \mid h_l) = 1$ (uniform over emissions), so the position contributes no evidence to state discrimination. [↩](#gloss-use-4)
5. <a id="gloss-5"></a> **Emission probability.** $P(s_l \mid h_l = k)$: the probability of observing $s_l$ given hidden state $k$. In this model, $P(s_l = 1 \mid h_l = w) = \mu_w$ and $P(s_l = 1 \mid h_l = r) = \mu_r$. [↩](#gloss-use-5)
6. <a id="gloss-6"></a> **Transition probability.** $T(h_l = k' \mid h_{l-1} = k)$: the probability of moving from state $k$ to state $k'$ between adjacent positions. Symmetric in this model: $T(r \mid w) = T(w \mid r) = \gamma$, $T(w \mid w) = T(r \mid r) = 1 - \gamma$. [↩](#gloss-use-6)
7. <a id="gloss-7"></a> **Forward-backward algorithm.** Computes per-site marginal probabilities $P(h_l = k \mid s)$ by combining forward messages $\alpha_{l,k} = P(s_1, \ldots, s_l, h_l = k)$ and backward messages $\beta_{l,k} = P(s_{l+1}, \ldots, s_L \mid h_l = k)$. Same $O(L \cdot K^2)$ complexity as Viterbi but gives posterior probabilities rather than a single best path (<a id="cite-2b"></a>[Rabiner 1989](https://doi.org/10.1109/5.18626) [[2](#ref-2)]). [↩](#gloss-use-7)
8. <a id="gloss-8"></a> **MRCA (Most Recent Common Ancestor).** The deepest node in a phylogenetic tree that is an ancestor of two given leaves. Used here to compute pairwise inter-clade distances for estimating $\mu_r$: $d(a, b) = d_{\text{root}}(a) + d_{\text{root}}(b) - 2 \cdot d_{\text{root}}(\text{MRCA}(a, b))$ [[src](https://github.com/nextstrain/nextclade/blob/d69f48972/packages/nextclade/src/analyze/recombination_estimate.rs#L241)]. [↩](#gloss-use-8)
9. <a id="gloss-9"></a> **Homoplasy (homoplasic site).** A character state shared by taxa but not inherited from a common ancestor, arising from convergent or parallel mutation or reversion rather than shared descent. A homoplasic site is a genome position where the same substitution recurs independently on separate lineages, so a match to the parent there is weak evidence of shared ancestry. [↩](#gloss-use-9)

## References

1. <a id="ref-1"></a> Baum, Leonard E., Ted Petrie, George W. Soules, and Norman Weiss. 1970. "A Maximization Technique Occurring in the Statistical Analysis of Probabilistic Functions of Markov Chains." _The Annals of Mathematical Statistics_ 41(1):164-171. https://doi.org/10.1214/aoms/1177697196 [↩](#cite-1)
2. <a id="ref-2"></a> Rabiner, Lawrence R. 1989. "A Tutorial on Hidden Markov Models and Selected Applications in Speech Recognition." _Proceedings of the IEEE_ 77(2):257-286. https://doi.org/10.1109/5.18626 [↩¹](#cite-2a) [↩²](#cite-2b)
3. <a id="ref-3"></a> Viterbi, Andrew J. 1967. "Error Bounds for Convolutional Codes and an Asymptotically Optimum Decoding Algorithm." _IEEE Transactions on Information Theory_ 13(2):260-269. https://doi.org/10.1109/TIT.1967.1054010 [↩](#cite-3)
4. <a id="ref-4"></a> Martin, Darren P., Arvind Varsani, Philippe Roumagnac, et al. 2021. "RDP5: A Computer Program for Analyzing Recombination in, and Removing Signals of Recombination from, Nucleotide Sequence Datasets." _Virus Evolution_ 7(1):veaa087. https://doi.org/10.1093/ve/veaa087 [↩](#cite-4)
5. <a id="ref-5"></a> Boni, Maciej F., David Posada, and Marcus W. Feldman. 2007. "An Exact Nonparametric Method for Inferring Mosaic Structure in Sequence Triplets." _Genetics_ 176(2):1035-1047. https://doi.org/10.1534/genetics.106.068874 [↩](#cite-5)
6. <a id="ref-6"></a> Kosakovsky Pond, Sergei L., David Posada, Michael B. Gravenor, Christopher H. Woelk, and Simon D. W. Frost. 2006. "GARD: A Genetic Algorithm for Recombination Detection." _Bioinformatics_ 22(24):3096-3098. https://doi.org/10.1093/bioinformatics/btl474 [↩](#cite-6)
7. <a id="ref-7"></a> Posada, David, and Keith A. Crandall. 2001. "Evaluation of Methods for Detecting Recombination from DNA Sequences: Computer Simulations." _Proceedings of the National Academy of Sciences_ 98(24):13757-13762. https://doi.org/10.1073/pnas.241370698 [↩](#cite-7)
8. <a id="ref-8"></a> Li, Na, and Matthew Stephens. 2003. "Modeling Linkage Disequilibrium and Identifying Recombination Hotspots Using Single-Nucleotide Polymorphism Data." _Genetics_ 165(4):2213-2233. https://doi.org/10.1093/genetics/165.4.2213 [↩](#cite-8)
9. <a id="ref-9"></a> Schultz, Anne-Kathrin, Ming Zhang, Thomas Leitner, et al. 2006. "A Jumping Profile Hidden Markov Model and Applications to Recombination Sites in HIV and HCV Genomes." _BMC Bioinformatics_ 7:265. https://doi.org/10.1186/1471-2105-7-265 [↩](#cite-9)
10. <a id="ref-10"></a> Westesson, Oscar, and Ian Holmes. 2009. "Accurate Detection of Recombinant Breakpoints in Whole-Genome Alignments." _PLoS Computational Biology_ 5(3):e1000318. https://doi.org/10.1371/journal.pcbi.1000318 [↩](#cite-10)
11. <a id="ref-11"></a> Simmonds, Peter. 2006. "Recombination and Selection in the Evolution of Picornaviruses and Other Mammalian Positive-Stranded RNA Viruses." _Journal of Virology_ 80(22):11124-11140. https://doi.org/10.1128/jvi.01076-06 [↩](#cite-11)
12. <a id="ref-12"></a> Durbin, Richard, Sean R. Eddy, Anders Krogh, and Graeme Mitchison. 1998. _Biological Sequence Analysis: Probabilistic Models of Proteins and Nucleic Acids_. Cambridge University Press. https://doi.org/10.1017/CBO9780511790492 [↩](#cite-12)
