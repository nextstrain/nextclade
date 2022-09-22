import json
from pprint import pprint

#  - "rbdRange" renamed to "aaRange"
#  - "weights" and "coefficients" are merged into an object, to avoid useless lookup. One-to-one mapping is assumed.
#  - entries where weight is 0 are removed
#  - "locations" is a map of either:
#     - position to coefficient
#     - position to a map of AA to a coefficient
if __name__ == '__main__':
  with open("data_dev/virus_properties_.json") as f:
    data = json.load(f)

  def convert_escape_data(escapeData):
    weights = escapeData["weights"]
    coefficients = escapeData["coefficients"]

    data = []
    for name, weight in weights.items():
      if weight == 0:
        continue

      coeffs = coefficients.get(name)

      data.append({
        "name": name,
        "weight": weight,
        "locations": coeffs,
      })

    escapeData = {
      **escapeData,
      "aaRange": escapeData["rbdRange"],
      "data": data
    }
    del escapeData["weights"]
    del escapeData["coefficients"]
    del escapeData["rbdRange"]

    return escapeData

  data["escapeData"] = list(map(convert_escape_data, data["escapeData"]))

  with open("data_dev/virus_properties.json", "w") as f:
    json.dump(data, f, indent=2)
