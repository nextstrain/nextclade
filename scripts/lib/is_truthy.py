ADDITIONAL_FALSY = ["False", "FALSE", "false", "0", "no", "No", "NO"]


def is_truthy(val):
  return bool(val) and val not in ADDITIONAL_FALSY
