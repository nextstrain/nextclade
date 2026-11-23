# Release script pre-checks pass when `git status` fails

## Problem

`scripts/release` checks for uncommitted changes with `[ -n "$(git status --porcelain | grep -v ...)" ]`, and for an out-of-sync `Cargo.lock` with `[ -n "$(git status --porcelain Cargo.lock)" ]`. When `git status` fails, the command substitution is empty and both checks pass. `set -euo pipefail` does not stop the script, because the exit status of a command substitution inside `[ ... ]` is ignored.

Example: `./docker/dev scripts/release minor` in a git worktree. The container mounts only the worktree, so its `.git` file points to a directory that does not exist in the container, and `git status` fails with `fatal: not a git repository`. The dirty check prints a pass. The script stops at the next check, because `BRANCH=$(git rev-parse --abbrev-ref HEAD)` is a plain assignment, which `set -e` does stop.

No release is known to have been affected: when the repository is missing, `git rev-parse` fails too, so the branch check stops the script before it changes files. Only the order of the checks protects the release, because the dirty check itself checks nothing when git fails.

## Code

- Dirty check and `Cargo.lock` check in `scripts/release`

## Fix

Assign the output of `git status --porcelain` to a variable first, so that `set -e` stops the script when git fails, then filter the variable. Apply the same change to the `Cargo.lock` check.
