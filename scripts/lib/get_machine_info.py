import os
from collections import namedtuple


def get_machine_info():
  uname = os.uname()
  sysname = uname.sysname
  if sysname == "Darwin":
    sysname = "MacOS"

  machine = uname.machine
  if sysname == "MacOS" and machine == "i386":
    # x86_64 is called i386 on macOS, fix that
    sysname = "x86_64"

  BUILD_OS = os.environ.get("BUILD_OS") or sysname
  HOST_OS = os.environ.get("HOST_OS") or BUILD_OS
  BUILD_ARCH = os.environ.get("BUILD_ARCH") or machine
  HOST_ARCH = os.environ.get("HOST_ARCH") or BUILD_ARCH
  CROSS = BUILD_OS != HOST_OS or BUILD_ARCH != HOST_ARCH

  machine_info = {
    "BUILD_OS": BUILD_OS,
    "HOST_OS": HOST_OS,
    "BUILD_ARCH": BUILD_ARCH,
    "HOST_ARCH": HOST_ARCH,
    "CROSS": CROSS
  }

  return namedtuple('MachineInfo', machine_info.keys())(*machine_info.values())
