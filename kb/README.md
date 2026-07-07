# Knowledge Base

Shared knowledge base (KB). AI agents and humans collaborate here: documenting progress, tracking issues, recording design decisions, and maintaining project knowledge.

> 💡 ## LLM wiki pattern
>
> This knowledge base follows the [LLM wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern: raw source material is compiled by AI agents into structured, cross-linked knowledge articles. The organizing structure is human-defined. AI maintains content within that structure.

## Motivation

- AI continuity. Sessions start with zero memory. The KB persists decisions, defects, and findings so knowledge compounds instead of being rediscovered.
- Human onboarding. Synthesized view of algorithms, design rationale, open problems, and research context.
- Multi-agent coordination. Parallel agents working on different tasks share state through issues, decisions, and proposals.
- Preventing rework. Issues and decisions prevent re-investigating solved problems or re-introducing fixed bugs.
- Decision traceability. Design choices are documented with rationale, not left implicit in code.

## Directories

| Directory                  | Description                                                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`_raw/`](_raw/)           | Human-produced source material (specifications, papers, meeting notes). Read-only for AI.                                                                                                          |
| [`algo/`](algo/)           | Algorithm documentation: scientific background, implementation location, status.                                                                                                                   |
| [`decisions/`](decisions/) | Deliberate design choices and intentional divergences from a specification or expected behavior, with rationale (one file per decision).                                                           |
| [`features/`](features/)   | Feature status checklist: `[x]` done, `[/]` partial, `[ ]` not done.                                                                                                                               |
| [`issues/`](issues/)       | Concrete problems: bugs, missing features, regressions. Severity-prefixed (`H-`/`M-`/`N-`). The working list agents consult before domain work.                                                    |
| [`proposals/`](proposals/) | Design documents analyzing a problem space with options and tradeoffs. Source material for issues: every actionable item in a proposal must be extracted into a separate issue so it is not lost.  |
| [`reports/`](reports/)     | Research reports on algorithms, methods, and implementation analysis.                                                                                                                              |
| [`tests/`](tests/)         | Test coverage documentation by domain.                                                                                                                                                             |
| [`tickets/`](tickets/)     | Implementation instructions for a coding agent. One task per file, executable in one session without further research or decisions. Derived from an issue once the implementation path is decided. |

## Structure

[`_raw/`](_raw/) contains source material. All other directories contain AI-maintained derived knowledge. Source code is ground truth; KB entries are guides, not substitutes for code verification.

When new material is added to [`_raw/`](_raw/), dependent articles in other directories should be reviewed and updated.

## Taxonomy

Every work item falls into exactly one category:

| Category                        | Directory                                  | Scope                                                               |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| Implemented, documented         | [`algo/`](algo/), [`features/`](features/) | A feature and its algorithm, with parity/status recorded            |
| Deliberate divergence / removal | [`decisions/`](decisions/)                 | An intentional divergence from a specification or expected behavior |
| Not yet done                    | [`issues/`](issues/)                       | Bugs, missing features, stubs, regressions, behavioral differences  |
| New capability (pre-impl)       | [`proposals/`](proposals/)                 | A design not yet implemented, analyzed with options and tradeoffs   |
| New capability (post-impl)      | [`decisions/`](decisions/)                 | The shipped design of a new capability, recorded with rationale     |
| Research background             | [`reports/`](reports/)                     | Analysis of an algorithm, method, or the ecosystem                  |

### Decision rules

- Feature working as documented: [`features/`](features/) `[x]`, algorithm in a [`algo/`](algo/) domain file
- Feature deliberately behaving differently, or intentionally removed: [`decisions/`](decisions/) (one file with rationale)
- Feature missing, stubbed, or broken: [`issues/`](issues/) (severity-prefixed file)
- New capability, before implementation: [`proposals/`](proposals/); after implementation: [`decisions/`](decisions/)
- Fully decided, one-session implementation task: [`tickets/`](tickets/), linking back to its issue

### Severity (issues only)

| Prefix | Severity   | Criteria                                                                          |
| ------ | ---------- | --------------------------------------------------------------------------------- |
| `H-`   | High       | Crashes, panics, data loss, wrong results, or a missing standard feature          |
| `M-`   | Medium     | Wrong results under specific conditions, or a missing feature affecting workflows |
| `N-`   | Negligible | Edge cases, niche omissions, weak assertions, cosmetic                            |

### Proposal lifecycle

- Created during a research or design session with ecosystem survey, design axes, options, and tradeoffs
- Every actionable item extracted into a separate issue in [`issues/`](issues/). Items left only in proposals are effectively invisible to agents
- The user decides per axis. Decided items become tickets (if immediately implementable) or stay as issues (if further research is needed)
- Implemented proposals move to [`decisions/`](decisions/)

### Ticket lifecycle

- An issue exists in [`issues/`](issues/). A ticket is created in [`tickets/`](tickets/) with a `## Related issues` link back
- Ticket readiness: all design decisions made, implementation path clear, no open questions requiring user input. An issue with undecided design axes is not ready for a ticket
- Ticket executed. Both deleted if fully resolved; both updated to reflect remaining work on partial resolution

## Version control

- ALWAYS use `docs` as the conventional commit type for KB changes (commits, branches, PRs)
- Branch prefix: `docs/kb-...`
- Commit format: `docs(kb): ...`
