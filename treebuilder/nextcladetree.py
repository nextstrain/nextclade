from Bio import Phylo
from Bio.Phylo.BaseTree import Clade
from . import nuc_mut_from_str, revert

class NextcladeTree(object):
    """
    Class defines simple tree object with basic interface methods: reading and
    saving from/to files, initializing leaves with sequences from the
    alignment, making ancestral state inference
    """

    def __init__(self, tree_json, seq_length=1000):
        self.len_ref_seq = seq_length
        tree = Phylo.Newick.Tree(rooted=True)
        tree.root = Phylo.Newick.Clade(name=tree_json['tree']['name'])
        tree.root.id = 0
        tree.MAX_id = 0
        tree.root.branch_length = tree_json['tree']['node_attrs']['div']
        if 'nuc' in tree_json['tree']['branch_attrs']['mutations'].keys():
            tree.root.mutations = [nuc_mut_from_str(m) for m in tree_json['tree']['branch_attrs']['mutations']['nuc']]
            tree.root.reversion_mutations = [revert(m) for m in tree.root.mutations]
        else:
            tree.root.mutations = []
            tree.root.reversion_mutations = []
        self.tree = tree
        self.add_clade(self.tree.root, tree_json['tree'])
        self.prepare_nodes()

    def add_clade(self, clade, tree_json):
        if 'children' in tree_json.keys():
            for child in tree_json['children']:
                self.tree.MAX_id += 1
                new_clade =Phylo.Newick.Clade(name=child['name'])
                new_clade.id  = self.tree.MAX_id
                new_clade.branch_length = child['node_attrs']['div'] - clade.branch_length
                if 'nuc' in child['branch_attrs']['mutations'].keys():
                    new_clade.mutations = [nuc_mut_from_str(m) for m in child['branch_attrs']['mutations']['nuc']]
                    new_clade.reversion_mutations = [revert(m) for m in new_clade.mutations]
                else:
                    new_clade.mutations = []
                    new_clade.reversion_mutations = []
                clade.clades.append(new_clade)
                self.add_clade(new_clade, child)

    def prepare_nodes(self):
        """
        Set auxilliary parameters to every node of the tree.
        """
        self.tree.root.up = None
        parent = self.tree.root
        pre_dict = {}
        self.node_dictionary = _prepare_nodes_rec(parent, pre_dict)


def _prepare_nodes_rec(clade, pre_dict):
    pre_dict[clade.id] = clade
    parent = clade
    for c in parent.clades: 
        c.up = parent
        pre_dict = _prepare_nodes_rec(c, pre_dict)
    return pre_dict