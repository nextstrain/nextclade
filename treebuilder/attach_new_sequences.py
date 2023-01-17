from Bio import Phylo
from Bio.Phylo.BaseTree import Clade
from . import nuc_mut_from_str, revert, nuc_mut_from_dict, remove_mut, shared_mut

def attach_new_sequences(tree, sequences_df):
    for index, row in sequences_df.iterrows():
        new_private_nuc_mut = []
        new_private_nuc_mut.extend([nuc_mut_from_dict(dict_) for dict_ in row['privateNucMutations']['privateSubstitutions']])
        new_private_nuc_mut.extend([nuc_mut_from_dict(dict_) for dict_ in row['privateNucMutations']['privateDeletions']])
        new_private_nuc_mut.extend([nuc_mut_from_dict(dict_) for dict_ in row['privateNucMutations']['reversionSubstitutions']])
        new_private_nuc_mut = sorted(list(set(new_private_nuc_mut)))
        nearest_node = tree.node_dictionary[row['nearestNodeId']]
        move(tree, nearest_node, new_private_nuc_mut, row['seqName'])

def attach_node(tree, nearest_node, private_nuc_mut, seq_name):
    if nearest_node.is_terminal():
        #node is terminal - make internal and create dummy new terminal node
        nearest_node.name = str(nearest_node.name)+"_internal"
        new_terminal_node =Phylo.Newick.Clade(name=nearest_node.name)
        tree.tree.MAX_id += 1
        new_terminal_node.id  = tree.tree.MAX_id
        new_terminal_node.branch_length = 0
        new_terminal_node.mutations = []
        new_terminal_node.reversion_mutations = []
        new_terminal_node.up = nearest_node
        new_terminal_node.clade_membership = new_terminal_node.up.clade_membership
        nearest_node.clades.append(new_terminal_node)
    #print([m.__str__() for m in private_nuc_mut])
    new_clade =Phylo.Newick.Clade(name=str(seq_name)+"_new")
    tree.tree.MAX_id += 1
    new_clade.id  = tree.tree.MAX_id
    new_clade.branch_length = len(private_nuc_mut)/tree.len_ref_seq
    new_clade.mutations = private_nuc_mut
    new_clade.reversion_mutations = [revert(m) for m in new_clade.mutations]
    new_clade.up = nearest_node
    new_clade.clade_membership = new_clade.up.clade_membership
    nearest_node.clades.append(new_clade)
    return None

def create_node_between_nodes(tree, top_node, bottom_node, new_shared_mut, up=True):
    #print("creating node between nodes")
    new_node =Phylo.Newick.Clade(name="parent_"+str(tree.tree.MAX_id))
    tree.tree.MAX_id += 1
    new_node.id  = tree.tree.MAX_id
    new_node.up = top_node
    new_node.clade_membership = new_node.up.clade_membership
    if up==True:
        new_node_mut = remove_mut(bottom_node.reversion_mutations, new_shared_mut)
        new_node.reversion_mutations = new_node_mut
        new_node.mutations = [revert(m) for m in new_node.reversion_mutations]
        ##correct private mutations of bottom node
        bottom_node.reversion_mutations = new_shared_mut
        bottom_node.mutations = [revert(m) for m in bottom_node.reversion_mutations]
    else:
        new_node.mutations = new_shared_mut
        new_node.reversion_mutations = [revert(m) for m in new_node.mutations]
        ##correct private mutations of bottom node
        new_bottom_node_mut = remove_mut(bottom_node.mutations, new_shared_mut)
        bottom_node.mutations = new_bottom_node_mut
        bottom_node.reversion_mutations = [revert(m) for m in bottom_node.mutations]
    new_node.branch_length = len(new_node.mutations)/tree.len_ref_seq
    bottom_node.branch_length = len(bottom_node.mutations)/tree.len_ref_seq
    ##correct links to nodes
    top_node.clades.remove(bottom_node)
    top_node.clades.append(new_node)
    new_node.clades.append(bottom_node)
    bottom_node.up = new_node
    return new_node

def move(tree, nearest_node, private_nuc_mut, seq_name):

    closer_node = nearest_node

    ##check if distance of new_seq to parent is less than nearest node's distance to parent
    dist_nearest_node = len(nearest_node.reversion_mutations)
    shared_mut_ = shared_mut(nearest_node.reversion_mutations, private_nuc_mut)
    closeness = len(shared_mut_)
    if closeness > 0:
        closer_node = nearest_node.up
        if closeness == dist_nearest_node:
            ##should be attached to parent not nearest_node
            private_nuc_mut = remove_mut(private_nuc_mut, nearest_node.reversion_mutations)
            move(tree, nearest_node.up, private_nuc_mut, seq_name)
            return None
    
    max_closeness = closeness
    new_shared_mut = shared_mut_
    parent_closest = True
    ##check if distance of new_seq to child is less than nearest node's distance to parent
    for child in nearest_node.clades:
        dist_nearest_node = len(child.mutations)
        shared_mut_ = shared_mut(child.mutations, private_nuc_mut)
        closeness = len(shared_mut_)
        if closeness > max_closeness:
            closer_node = child
            max_closeness = closeness
            new_shared_mut = shared_mut_
            parent_closest = False
        if dist_nearest_node>0 and closeness == dist_nearest_node:
            ##should be attached to child not nearest_node
            private_nuc_mut =  remove_mut(private_nuc_mut, child.mutations)
            move(tree, child, private_nuc_mut, seq_name)
            return None
    if max_closeness == 0:
        ##should be attached to nearest_node
        attach_node(tree, nearest_node, private_nuc_mut, seq_name)
        return None
    else:
        ##should be attached to closer_node
        if parent_closest:
            new_node = create_node_between_nodes(tree, closer_node, nearest_node, new_shared_mut, up=True)
        else:
            new_node = create_node_between_nodes(tree, nearest_node, closer_node, new_shared_mut, up=False)
        private_nuc_mut = remove_mut(private_nuc_mut, new_shared_mut)
        attach_node(tree, new_node, private_nuc_mut,seq_name)
        return None