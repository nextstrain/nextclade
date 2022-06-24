# Human Adenovirus A (hAdv-A)

https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=129875

Initially contributed by [dnanto](https://github.com/nextstrain/nextclade/pull/673#issuecomment-1007488135)


Run from project root as

```bash
nextalign \
--verbose \
--in-order \
--sequences=data/adenovirus/hadv-a/sequences.fasta \
--reference=data/adenovirus/hadv-a/reference.fasta \
--genes=100K.1,12.5K.1,13.6K.1,13.6K.2,14.7K.1,19K.1,22K.1,33K.1,33K.2,34K.1,52K.1,55K.1,CR1-alpha.1,CR1-beta.1,DBP.1,E1A.1,E1A.2,II.1,III.1,IIIa.1,IV.1,IVa2.1,IX.1,ORF1.1,ORF2.1,ORF3.1,ORF4.1,ORF6slash7.1,ORF6slash7.2,RID-alpha.1,RID-beta.1,TP.1,TP.2,U.1,V.1,VI.1,VII.1,VIII.1,X.1,pol.1,pol.2,protease.1 \
--genemap=data/adenovirus/hadv-a/genemap.gff \
--nuc-seed-length=27 \
--nuc-seed-spacing=10 \
--max-indel=700 \
--output-dir=tmp/ \
--output-basename=nextalign
```
