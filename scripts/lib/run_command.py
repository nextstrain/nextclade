import re
import sys
from io import StringIO
from conans.client.runner import ConanRunner

runner = ConanRunner(print_commands_to_output=False)


def run(command, output=True, log_filepath=None, cwd=None, subprocess=False):
  command = re.sub(r'\s+', ' ', command).strip()
  sys.stdout.write(f"$ {command}\n")
  runner(command, output, log_filepath, cwd, subprocess)


def run_and_get_stdout(command, log_filepath=None, cwd=None, subprocess=False):
  output = StringIO()
  run(command, output, log_filepath, cwd, subprocess)
  output.seek(0)
  return output.read().strip()
