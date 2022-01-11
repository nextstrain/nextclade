import argparse

COMMANDS = [
  "install_deps",
  "codegen",
  "configure",
  "build",
  "test",
  "run",
]

ARGS = [
  "release",
  "static",
  "wasm",
]


def parse_args():
  parser = argparse.ArgumentParser(prog="build")

  parser.add_argument("commands", nargs='*')

  for arg in ARGS:
    parser.add_argument(f"--{arg}", dest=arg, action='store_true', required=False, default=False)

  args = parser.parse_args()

  for command in args.commands:
    if command not in COMMANDS:
      raise ValueError(f"Unexpected command: '{command}'. Expected zero, one or multiple among: {', '.join(COMMANDS)}.")

  return vars(args)
