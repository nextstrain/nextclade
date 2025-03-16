from Bio import SeqIO
from collections import defaultdict


# ./target/debug/nextclade run -d community/neherlab/hiv-1/hxb2 --output-all test-hiv hxb2/sequences.fasta
# run test_gff.py --gff test-hiv/nextclade.gff --fasta hxb2/sequences.fasta

# ./target/debug/nextclade run -d nextstrain/sars-cov-2/wuhan-hu-1/orfs --output-all test-sc2-orfs data/sars-cov-2/sequences.fasta
# run test_gff.py --gff test-sc2-orfs/nextclade.gff --fasta data/sars-cov-2/sequences.fasta

# ./target/debug/nextclade run -d nextstrain/sars-cov-2/wuhan-hu-1/proteins --output-all test-sc2-proteins data/sars-cov-2/sequences.fasta
# run test_gff.py --gff test-sc2-proteins/nextclade.gff --fasta data/sars-cov-2/sequences.fasta

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
                print(f, len(f.sub_features), f.location)
                if f.type == 'gene':
                    for c in f.sub_features:
                        print(c.id, c.qualifiers['Name'][0], c.location, c.extract(seq.seq).translate())
                # print(f.id, f.qualifiers['Name'][0], Seq.translate(f.extract(seq.seq)))



