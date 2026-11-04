# Knowledge Base

Shared knowledge base (KB). AI agents and humans collaborate here: documenting progress, tracking issues, recording design decisions, and maintaining project knowledge.

> 💡 ## LLM wiki pattern
>
> This knowledge base follows the [LLM wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern: raw source material is compiled by AI agents into structured, cross-linked knowledge articles. The organizing structure is human-defined. AI maintains content within that structure.

## Motivation

- AI continuity. Sessions start with zero memory. KB persists decisions, defects, and findings so knowledge compounds instead of being rediscovered.
- Human onboarding. Synthesized view of algorithms, design rationale, open problems, and research context.
- Multi-agent coordination. Parallel agents working on different issues share state through issues, decisions, proposals, and tickets.
- Scientific rigor. Public health work depends on Nextclade alignment, mutation calls, clade assignment, and QC. The KB tracks what is correct, what diverges from earlier releases, and why.
- Compatibility. Datasets, output files, and schemas are public interfaces. The KB records approved changes to shipped behavior and the known defects that a change must not break further.
- Preventing rework. Known issues and reports prevent re-investigating solved problems or re-introducing fixed bugs.
- Decision traceability. Scientific and large design choices are documented with rationale. Commit messages, code, and tests explain the other choices.

## Directories

A directory is created together with its first entry. An absent directory does not mean that its category has no items.

| Directory    | Description                                                                                                                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_raw/`      | Human-produced source material (specifications, papers, notes). Read-only for AI.                                                                                                                                                                         |
| `algo/`      | Algorithm documentation: scientific background, implementation status, source locations                                                                                                                                                                   |
| `decisions/` | Approved scientific and large design choices with rationale, one file per choice. See [Decision files](#decision-files)                                                                                                                                   |
| `features/`  | Feature inventory: `[x]` done, `[/]` partial, `[ ]` not done                                                                                                                                                                                              |
| `issues/`    | Concrete problems. Severity-prefixed (H/M/N). The working list agents consult before domain work. PREFER independent issues, but entangled problems may share a file when splitting would lose clarity                                                    |
| `proposals/` | Undecided design documents analyzing a problem space with options and tradeoffs. Source material for issues -- every actionable item in a proposal must be extracted into a separate issue so it is not lost when the proposal is no longer actively read |
| `reports/`   | Research reports on algorithms, datasets, and implementation analysis                                                                                                                                                                                     |
| `tests/`     | Test inventory: what each test suite covers and where coverage is missing                                                                                                                                                                                 |
| `tickets/`   | Implementation-ready work derived from decided issues. See [Ticket lifecycle](#ticket-lifecycle)                                                                                                                                                          |

## Structure

`_raw/` contains source material. All other directories contain AI-maintained knowledge derived from source code, datasets in [`nextstrain/nextclade_data`](https://github.com/nextstrain/nextclade_data), papers, and human decisions. Source code is ground truth. KB entries are guides, not substitutes for code verification.

The knowledge base holds prose and data only -- no executable code. Scripts and helper programs belong in [`scripts/`](../scripts/), and tests belong in [`tests/`](../tests/) or in the test modules of the packages.

When new material is added to `_raw/`, dependent articles in other directories should be reviewed and updated.

## Taxonomy

Every work item falls into exactly one category:

| Category                        | Directory                                                    | Scope                                                                       |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Implemented, documented         | `algo/`, `features/`                                         | Feature that works as specified                                             |
| Implemented, different behavior | `decisions/`                                                 | Scientific change to shipped behavior, or removal (see Decision files)      |
| Implemented, other difference   | None: commit message, code, tests                            | Naming, library, UI, or code structure change                               |
| Not yet done                    | `issues/`, `features/` `[ ]` or `[/]`                        | Bugs, missing features, stubs, regressions, unused config keys              |
| Ready to implement              | `tickets/`                                                   | Decided issue with a clear implementation path                              |
| New capability                  | `proposals/` (pre-implementation), `decisions/` (post-impl.) | Feature not yet in Nextclade (see Decision files)                           |
| Research background             | `reports/`                                                   | Analysis of an algorithm, a dataset, or a problem space without a work item |

### Decision rules

- Feature working as specified: `features/` `[x]`, algorithm in the domain file in `algo/`
- Feature working with different scientific results than the shipped release: `decisions/` (one file with rationale)
- Scientific feature, CLI flag, config key, or dataset field intentionally removed: `decisions/` (one file with rationale and the deprecation path)
- Other implemented difference (naming, library, UI, code structure): no KB entry; the commit message holds the reason
- Feature missing, stubbed, or broken: `issues/` (severity-prefixed file), and `features/` `[ ]` or `[/]` when the feature is listed there
- New feature: `proposals/` pre-implementation, then `decisions/` post-implementation only for a large design choice
- Finding outside the scope of the current branch: file it in the matching category instead of dropping it

### Decision files

A decision file records a choice that a reader must know to trust a Nextclade result or to plan a large change. Two kinds of choice qualify:

- Scientific choices: a change to alignment, translation, mutation calling, phylogenetic placement, clade assignment, QC scoring, a numerical method, or a scientific default, including every change of a shipped scientific output
- Large design choices: choices that shape many packages or the whole product and cost much to undo, such as the dataset format, the output and tree schemas, the representation of missing and deleted regions, the boundary between the Rust library and the web application, or a new or removed command

Other choices, such as code structure, names, types, library choice, number format, UI behavior, and performance techniques, keep their reason in the code, the tests, the commit message, or the project rules. A file for every small choice hides the few that matter.

The maintainer team approves every decision file. A decision file records an approval that already happened; writing the file does not grant approval.

### Severity (issues only)

| Prefix | Severity   | Criteria                                                                                         |
| ------ | ---------- | ------------------------------------------------------------------------------------------------ |
| `H-`   | High       | Crashes, data loss, incorrect scientific results, or blocked required behavior                   |
| `M-`   | Medium     | Incorrect behavior under bounded conditions or a specified capability gap                        |
| `N-`   | Negligible | Documentation, test, maintainability, or presentation defect with no demonstrated runtime effect |

Derive severity from specification language, user requirements, external evidence, or demonstrated impact. If the evidence does not distinguish a severity, do not infer one from assumed usage frequency.

### Proposal lifecycle

- A proposal records the problem space, design axes, options, and tradeoffs
- Extract every actionable item into a separate issue. Keep open design questions in their issues until the required decisions are approved
- When a proposal is resolved or implemented, move it to `decisions/` or delete it. Git history preserves the record

### Issue lifecycle

- An issue records the problem, its locations, the fix direction, and the validation plan when one is known. It is the unit of work an agent or developer picks up
- Open design questions stay in the issue until the required decisions are approved. Mark them with a `> [!IMPORTANT]` block that starts with **Decision required.** and states the conflict, the options, and the evidence without choosing an option
- Mark a claim that lacks evidence (an unreproduced defect, an unmeasured cost, an unverified contract) with a `> [!IMPORTANT]` block that starts with **Investigation required.** and names the evidence to collect
- Mark statements that code changes may have made stale with a `> [!WARNING]` block that starts with **Needs review.** and gives the evidence
- Delete the issue when it is fully resolved. On partial resolution, update it to describe the remaining work

### Ticket lifecycle

- A ticket derives from an existing issue and links back to it in a `## Related issues` section. A proposal never becomes a ticket directly: its items become issues first
- Create a ticket only when all design decisions of the issue are made, the implementation path is clear, and no open question needs a maintainer's input
- Delete the ticket and its source issue when the work is fully resolved

## Conventions

- Link text is the filename or the `kb/`-relative path, for example [`issues/M-qc-snp-clusters-shared-substitutions.md`](issues/M-qc-snp-clusters-shared-substitutions.md). Within the same subdirectory, use the filename only
- Code comments and TODO notes refer to entries by plain path, such as `kb/issues/M-foo.md`, without a markdown link
- KB changes use the `docs` commit type: `docs(kb): ...`, on branches with the `docs/kb-` prefix
