# Who switches recombination detection on

> Open design question: a switch in the dataset only, or also a switch for users on each run.

## Context

Recombination detection is opt-in. The dataset switches it on with `recombination.enabled` in `pathogen.json`, and the CLI flags `--with-recombination` and `--without-recombination` override that value (see [kb/tickets/feat-recombination-opt-in-and-call-qc.md](../tickets/feat-recombination-opt-in-and-call-qc.md)).

The scientific review of the first implementation describes a different model:

- The dataset decides whether detection is allowed at all. For some pathogens, such as HIV, the model does not fit, and users should not be able to switch it on
- Where detection is allowed, the user switches it on for a run

Nextclade Web has no UI for user toggles of analysis options today. A user switch in Web needs a new section in the app, for example a panel of advanced options. The CLI can take a flag.

## Concern

The two models conflict on one point: `--with-recombination` can switch detection on for any dataset with a tree, including datasets whose curators consider the model unsuitable.

## Open questions

- Should a dataset be able to forbid detection, so that no user switch can turn it on?
- Should `enabled` mean "allowed", with a separate default for runs that do not set the switch?
- Should Nextclade Web get a user switch, and in which part of the app?

The review asks for input from more members of the team before a decision.

## Current state

The dataset switch decides, and the CLI flags override it in both directions.
