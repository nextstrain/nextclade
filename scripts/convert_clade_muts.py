import json


def convert_labels(labels):
  return [label["Nextstrain_clade"] for label in labels]


def reverse_a_dict(dict_of_lists):
  result = {}
  for k, v in dict_of_lists.items():
    for x in v:
      result.setdefault(x, []).append(k)
  return result


with open("data_dev/clade_muts.json", "r") as f_in, open("data_dev/virus_properties.json", "w") as f_out:
  clade_muts = json.load(f_in)

  mut_to_clades = {clade: convert_labels(labels) for clade, labels in clade_muts.items()}

  clades = mut_to_clades

  virus_json = {
    "schemaVersion": "1.10.0",
    "nucMutLabelMap": mut_to_clades,
    "nucMutLabelMapReverse": reverse_a_dict(mut_to_clades),
  }

  json.dump(virus_json, f_out, indent=2, sort_keys=True)
