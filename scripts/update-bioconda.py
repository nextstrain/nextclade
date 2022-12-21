#!/usr/bin/env python3

###
### Update bioconda recipe
###

from os.path import join
from hashlib import sha256
import re
import sys

archs = {
  "linux64": "x86_64-unknown-linux-gnu",
  "osx and x86_64": "x86_64-apple-darwin",
  "arm64": "aarch64-apple-darwin"
}

if __name__ == '__main__':
  # Base name of the executable
  name = sys.argv[1]

  # New version string, e.g. 1.23.4
  version = sys.argv[2]

  # Path to directory with executables
  bin_dir = sys.argv[3]

  # Path to meta.yml file from bioconda recipe
  meta_yml_path = sys.argv[4]

  with open(meta_yml_path, "r") as f:
    meta_yaml = f.read()

  # Bump version variable
  meta_yaml = re.sub(r'version = "(.+)"', rf'version = "{version}"', meta_yaml)

  # Reset build number to 0
  meta_yaml = re.sub(r'build:\n(\s+)number:\s+\d+', r'build:\n\1number: 0', meta_yaml)

  # Update file hashes of executables
  for selector, arch in archs.items():
      with open(join(bin_dir, f"{name}-{arch}"), "rb") as f:
        digest = sha256(f.read()).hexdigest()

      meta_yaml = re.sub(rf'(?<=sha256: )(\S+)(?=\s+# \[{selector}\])', f"{digest}", meta_yaml)

  with open(meta_yml_path, "w") as f:
    f.write(meta_yaml)
