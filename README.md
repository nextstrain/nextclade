# Tree-Builder-Prototype
This is a simple python prototype for a adding a local tree builder into nextclade, currently only using nucleotide values.

Run nextclade on data sets (with reference tree, sequences to append to tree and reference sequence) using the command 
```
nextclade run --input-dataset data/ --output-all=output data/sequences.fasta 
```

This will generate a new tree `nextclade.auspice.json` where sequences have been attached to the nearest node in the reference tree. The `.ndjson` contains information about which node each sequence was attached to, and mutations from that node in the reference tree to the newly attached sequence node (so called private mutations). An example can be seen in the `test_data` folder. 

We use these files as input to compute an optimal location of each new sequence node by moving locally up and down in the tree from that attached node. 
Using the command: 
```
treebuilder -t test_data/tree.json -d test_data/nextclade.ndjson -r test_data/reference.fasta 
```
This new tree is returned as: `output_tree.json`. 
