import argparse

COMMANDS = [
  "install_deps",
  "codegen",
  "configure",
  "build",
]

ARGS = [
  "release",
  "static",
  "wasm",
]


def parse_args():
  parser = argparse.ArgumentParser(prog="build")

  parser.add_argument("commands", nargs='*', choices=COMMANDS)

  for arg in ARGS:
    parser.add_argument(f"--{arg}", dest=arg, action='store_true', required=False, default=False)

  args = parser.parse_args()

  return vars(args)
