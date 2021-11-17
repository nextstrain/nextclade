# Nextalign 2.0

- Install Rust toolchain like described here: https://www.rust-lang.org/tools/install

  By default the Rust compiler will end up in `~/.rustup/toolchains/` and Cargo package manager in `~/.cargo/bin/`.

- Check versions:

  ```
  rustc --version
  rustc 1.56.1 (59eed8a2a 2021-11-01)
  
  cargo --version
  cargo 1.56.0 (4ed5d137b 2021-10-04)
  ```

- Run in dev mode:

  ```
  cd packages/nextalign_rs
  cargo run .
  ```

- Build and run in prod mode (with performance optimizations):

  ```
  cd packages/nextalign_rs/
  cargo build --release
  ./target/release/nextalign
  ```

- Run with prettified `time` command:

  ```
  /usr/bin/time -f 'Wall clock time:         %E\nMaximum resident memory: %M KB\n' ./target/release/nextalign
  ```

- Compare to Nextalign 1.0:
  ```
  /usr/bin/time -f 'Wall clock time:         %E\nMaximum resident memory: %M KB\n' ./.out/bin/nextalign-Linux-x86_64 --sequences=data/sars-cov-2/sequences.fasta --reference=data/sars-cov-2/reference.fasta --genemap=data/sars-cov-2/genemap.gff --genes=E,M,N,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S --output-dir=tmp/ --output-basename=nextalign --include-reference --verbose --in-order --jobs=1
  ```
