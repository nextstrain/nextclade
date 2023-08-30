from  treebuilder import NextcladeTree, attach_new_sequences, write_new_json
import json
import pandas as pd
import Bio.AlignIO as AlignIO

ref_tree_json = "test_data/tree.json" 
new_seq_ndjson = "test_data/nextclade.ndjson" 
ref_seq_fasta = "test_data/reference.fasta" 

# Opening JSON file
tree_json_as_dict = json.load(open(ref_tree_json))

#Get length of reference sequence
ref_seq = AlignIO.read(ref_seq_fasta, 'fasta') 
len_ref_seq = len(ref_seq[0].seq)

nc_tree = NextcladeTree(tree_json_as_dict, seq_length=len_ref_seq)
#import ipdb; ipdb.set_trace()

#get new sequences with attachment points and private mutations
df = pd.read_json(new_seq_ndjson, lines=True)
sequences_df = df[['seqName', 'nearestNodeId', 'privateNucMutations']]

## attach sequences to tree
attach_new_sequences(nc_tree, sequences_df)

mutation_dict = {
    "n" : ["C72T"], 
    "a_new": ["T71C"], 
    "b_new": ["C72A"], 
    "e_new": ["G78C"], 
    "d_new": [], 
    "c1":["C75A", "C76A", "C77A"],
    "c2": ["C77T"]
    }


def check_clade_mutations(n):
    if n.name in mutation_dict:
        assert set([m.__str__() for m in n.mutations]) == set(mutation_dict[n.name])

n = nc_tree.tree.root
check_clade_mutations(n)
