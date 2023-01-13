import json

def create_tree_dict(tree, div=0):
    tree_dict = {}
    tree_dict['name'] = tree.root.name
    tree_dict["branch_attrs"] = {}
    tree_dict["branch_attrs"]["mutations"] = {}
    tree_dict["branch_attrs"]["mutations"]["nuc"] = [m.__str__() for m in tree.root.mutations]
    tree_dict["branch_attrs"]["label"] = {
        "aa": "",
        "clade": tree.root.clade_membership
        }
    tree_dict["node_attrs"] = {}
    tree_dict["node_attrs"]["div"] = tree.root.branch_length + div
    tree_dict["node_attrs"]["clade_membership"] ={
                "value": tree.root.clade_membership
              }
    if tree.root.name.endswith('new'):
        tree_dict["node_attrs"]["Node type"]= {
                "value": "New"
              }
        tree_dict["node_attrs"]["region"] ={
                    "value": "Unknown "
                  }
        tree_dict["node_attrs"]["country"] = {
                    "value": "Unknown "
                  }
        tree_dict["node_attrs"]["division"] = {
                    "value": "Unknown "
                  }
        tree_dict["node_attrs"]["Alignment"] = {
                    "value": "start: 0, end: 1737 (score: 5179)"
                  }
        tree_dict["node_attrs"]["Missing"] = {
                    "value": ""
                  }
        tree_dict["node_attrs"]["Gaps"] = {
                    "value": ""
                  }
        tree_dict["node_attrs"]["Non-ACGTNs"]= {
                    "value": ""
                  }
        tree_dict["node_attrs"]["Has PCR primer changes"]= {
                    "value": "Yes"
                  }
        tree_dict["node_attrs"]["PCR primer changes"]= {
                    "value": ""
                  }
        tree_dict["node_attrs"]["QC Status"]= {
                    "value": "good"
                  }
        tree_dict["node_attrs"]["Missing genes"]= {
                    "value": ""
                  }
    else:
        tree_dict["node_attrs"]["Node type"]= {
                "value": "Reference"
              }

    tree_dict["node_attrs"]["region"]= {
                "value": "Unknown "
              }
    tree_dict["node_attrs"]["date"] =  {
          "value": "Unknown "
    }
    if len(tree.root.clades)>0:
      tree_dict['children'] = []
      for c in tree.root.clades:
          tree_dict['children'].append(create_tree_dict(c, div=(tree.root.branch_length + div)))
    return tree_dict

def write_new_json(file_name, tree, initial_json):

        tree_dict = create_tree_dict(tree)
        json_str_pre = json.dumps(tree_dict, indent=4)
        initial_json["tree"] = tree_dict
        json_str = json.dumps(initial_json, indent=4)
        with open(file_name, "w") as outfile:
            outfile.write(json_str)