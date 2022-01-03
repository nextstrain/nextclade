from collections import namedtuple

def dict_to_namedtuple(name: str, dic: dict):
  return namedtuple(name, dic.keys())(*dic.values())
