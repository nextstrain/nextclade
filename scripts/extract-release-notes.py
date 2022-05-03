#!/usr/bin/env python3

import argparse
import sys


def find_release_notes(input_changelog_md: str):
  release_notes = ""
  found_release_notes_block = False
  with open(input_changelog_md) as f:
    for line in f:
      if not found_release_notes_block and line.startswith("## "):
        found_release_notes_block = True
        release_notes += line
      elif found_release_notes_block:
        if line.startswith("## "):
          return release_notes
        else:
          release_notes += line


if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='Extracts last release notes section from a changelog markdown file')
  parser.add_argument('input_changelog_md', type=str, help='Input changelog file in markdown format')
  args = parser.parse_args()

  release_notes = find_release_notes(args.input_changelog_md)

  sys.stdout.write(release_notes)
