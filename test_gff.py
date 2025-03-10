from Bio import SeqIO, Seq
from collections import defaultdict

if __name__=="__main__":
    # read a fasta file and a gff file from the command line
    import argparse
    parser = argparse.ArgumentParser(description="test nextclade annotations")
    parser.add_argument("--fasta", help="fasta file with input query sequences")
    parser.add_argument("--gff", help="gff file with annotations")
    args = parser.parse_args()

    # features = load_features(args.gff)
    from BCBio import GFF
    annotations = defaultdict(list)
    with open(args.gff) as gff_in:
        for feat in GFF.parse(gff_in): #, limit_info={'gff_type': ['CDS', 'region', 'gene']}):
            seq_id = feat.id
            for f in feat.features:
                annotations[seq_id].append(f)
    # read the fasta file
    seqs = list(SeqIO.parse(args.fasta, "fasta"))

    for seq in seqs:
        if seq.id in annotations:
            for f in annotations[seq.id]:
                print(f.id, Seq.translate(f.extract(seq.seq)))



