# CLI flags for recombination parameters

> Open design question: whether each `recombination` setting gets a CLI flag.

## Context

The `recombination` object in `pathogen.json` holds `gamma`, `muW`, `muR`, `minRegionLength`, `maxRegionMissingFraction` and `maxRecombinantFraction`. Only `enabled` has CLI flags (`--with-recombination`, `--without-recombination`).

The alignment parameters set a precedent: each one has a CLI flag, and the CLI value overrides `pathogen.json`, which overrides the presets and the defaults.

## Open questions

- Should each recombination setting get a CLI flag with the same precedence?
- If yes, the flag names, for example `--recombination-gamma` and `--recombination-min-region-length`

The scientific review leans toward flags for each setting and asks for input from more members of the team.

## Current state

The settings come only from `pathogen.json`, and missing parameters are estimated from the reference tree.
