import json, os, requests
from copy import deepcopy

def get_node_struct(seq):
    return {'branch_attrs':{'mutations':{}},
            'name':seq['seqName']+"_clades",
            'node_attrs':{'clade_membership':{'value':seq['clade']},
                          'new_node': {'value': 'Yes'},
                          'QCStatus':{'value':seq['QCStatus']}},
            'mutations':{}
            }


def get_root_seq():
    with open('src/assets/data/defaultRootSequence.txt', 'r') as fh:
        seq = ''.join(map(lambda x:x.strip(), fh.readlines()))
    return seq

def mutations_on_tree(node, mutations):
    tmp_muts = deepcopy(mutations)
    if 'branch_attrs' in node and 'nuc' in node['branch_attrs']['mutations']:
        for mut in node['branch_attrs']['mutations']['nuc']:
            anc, pos, der = mut[0], int(mut[1:-1])-1, mut[-1]
            if pos in tmp_muts and tmp_muts[pos]!=anc:
                print("inconsistent")

        tmp_muts[pos] = der
    node["mutations"] = tmp_muts
    if "children" in node:
        for c in node['children']:
            mutations_on_tree(c, tmp_muts)


def calculate_distance(node, seq):
    shared_differences = 0
    shared_sites = 0
    for qmut in seq['mutations']:
        if qmut['pos'] in node['mutations']:
            if qmut['queryNuc'] == node['mutations'][qmut['pos']]:
                shared_differences += 1
            else:
                shared_sites += 1

    return len(node["mutations"]) + len(seq['mutations']) - 2*shared_differences - shared_sites

def get_differences(node, seq):
    shared_differences = 0
    shared_sites = 0
    mutations = []
    for qmut in seq['mutations']:
        if qmut['pos'] in node['mutations']:
            if qmut['queryNuc'] != node['mutations'][qmut['pos']]:
                mutations.append(node['mutations'][qmut['pos']]+str(qmut['pos']+1)+qmut['queryNuc'])
        else:
            mutations.append(root_seq[qmut['pos']]+str(qmut['pos']+1)+qmut['queryNuc'])

    return mutations


def closest_match(node, seq):
    best = calculate_distance(node, seq)
    best_node = node
    if "children" in node:
        for c in node['children']:
            tmp_best, tmp_best_node = closest_match(c, seq)
            if tmp_best<best:
                best = tmp_best
                best_node = tmp_best_node

    return best, best_node


def attach_to_tree(base_node, seq):
    if 'children' not in base_node:
        base_node['children'] = []
    mutations = get_differences(base_node, seq)
    new_node = get_node_struct(seq)
    new_node['branch_attrs']['mutations']['nuc'] = mutations
    new_node['node_attrs']['div'] = base_node['node_attrs']['div'] + len(mutations)
    new_node['mutations'] = deepcopy(base_node['mutations'])
    for mut in mutations:
        anc, pos, der = mut[0], int(mut[1:-1])-1, mut[-1]
        new_node['mutations'][pos] = der

    base_node['children'].append(new_node)

def remove_mutations(node):
    if 'mutations' in node:
        node.pop('mutations')
    if 'children' in node:
        for c in node['children']:
            remove_mutations(c)

if __name__ == '__main__':

    if os.path.isfile('tree.json'):
        with open('tree.json', 'r') as fh:
            T = json.load(fh)
    else:
        r = requests.get('https://nextstrain-neherlab.s3.amazonaws.com/ncov_small.json')
        T = r.json()
        with open('tree.json', 'w') as fh:
            json.dump(T, fh)


    root_seq = get_root_seq()

    with open('nextclades.json', 'r') as fh:
        data = json.load(fh)

    # start that the root of the tree
    focal_node = T['tree']

    mutations_on_tree(focal_node, {})

    for seq in data[:]:
        if 'errors' in seq and seq['errors']:
            continue
        match, match_node = closest_match(focal_node, seq)
        print(seq['seqName'], match_node['name'], match)
        print(get_differences(match_node, seq))
        attach_to_tree(match_node, seq)

    remove_mutations(focal_node)

    T['meta']['colorings'].append({'key': 'QCStatus',
                                  'title': 'QC Status',
                                  'type': 'categorical'},
                                )
    T['meta']['colorings'].append({'key': 'new_node',
                                  'title': 'New Node',
                                  'type': 'categorical'},
                                )

    T['meta']['display_defaults'] = {'branch_label': 'clade',
                                    'color_by': 'new_node',
                                    'distance_measure': 'div',
                                    'geo_resolution': 'country',
                                    'map_triplicate': True,
                                    'transmission_lines': False}


    with open('tree_clades.json', 'w') as fh:
        json.dump(T, fh)
