import os
import re
import subprocess
import sys
from io import StringIO
from pprint import pprint
from typing import *

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


def join_path_var(values: List[str]):
  values = filter(None, values)
  values = filter(lambda x: len(x) > 0, values)
  return ':'.join(values)


def merge_path_var(config, var_name):
  values = [config.get(var_name), os.environ.get(var_name)]
  return join_path_var(values)


class Shell:
  def __init__(self, cwd=None, config=None, env_setup_script=None):
    self._cwd = cwd

    config_env = {}
    if config is not None:
      config_env = {k: str(v) for k, v in config._asdict().items()}

    pprint(config_env)

    # For some PATH-like variables, instead of overwriting OS values, merge the incoming values in
    env = {**os.environ, **config_env}
    for var_name in ["PATH", "C_INCLUDE_PATH", "CPLUS_INCLUDE_PATH", "CPATH", "LIBRARY_PATH", "LD_LIBRARY_PATH"]:
      value = merge_path_var(config_env, var_name)
      if value is not None and len(value) > 0:
        env[var_name] = value

    self._env = env
    self._env_setup_script = env_setup_script or ""

  def __call__(self, command, cwd=None, output=None):
    command = re.sub(r'\s+', ' ', command).strip()
    sys.stdout.write(f"$ {command}\n")

    # pprint(self._env)

    subprocess.run(f"""
      {self._env_setup_script}
      set -euxo pipefail;
      {command}
    """, cwd=(cwd or self._cwd), env=self._env, shell=True, executable="/bin/bash", check=True)
