
  $ mkdir -p "$TESTDIR/tmp"
  $ pushd "$TESTDIR/tmp" > /dev/null
  $ export NEXTCLADE="../../../.out/nextclade-x86_64-unknown-linux-gnu"

List datasets

  $ ${NEXTCLADE} dataset list > /dev/null

List datasets given a name

  $ ${NEXTCLADE} dataset list --name='sars-cov-2' > /dev/null

Download dataset directory

  $ ${NEXTCLADE} dataset get --name='sars-cov-2' --tag='2022-04-28T12:00:00Z' --output-dir='data/'  > /dev/null

  $ cat 'data/tag.json' | grep '"tag": '
    "tag": "2022-04-28T12:00:00Z"

Run

  $ ${NEXTCLADE} run \
  > --jobs=1 \
  > --in-order \
  > --include-reference \
  > --output-all='out/' \
  > --input-dataset='data/' \
  > 'data/sequences.fasta'
