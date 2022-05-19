

test: readme
	@cargo test --all --features="test type-guards"

doc: readme
	@rm -rf target/doc
	@cargo doc --no-deps --open --features="type-guards"
	# ./scripts/readme.sh

#@awk '{ print "//! " $$0}' README.md  > src/README.rs
./src/README.rs : README.md
	@(echo '/*!'; cat README.md; echo '*/'; ) > src/README.rs



readme: ./src/README.rs


format:
	@rustup component add rustfmt 2> /dev/null
	@cargo fmt

format-check: readme
	@rustup component add rustfmt 2> /dev/null
	@cargo fmt -- --check

lint:
	@rustup component add clippy 2> /dev/null
	@cargo clippy

check-readme:
	@cargo readme -i src/README.rs --no-title --no-indent-headings --no-license > /tmp/README.md
	@diff -w README.md /tmp/README.md && rm -rf /tmp/README.md && echo "OK"

update-readme:
	@cd typescript-definitions-derive; cargo readme > README.md

pre-publish: update-readme test format-check lint

publish: pre-publish
	@cargo publish

img:
	@echo "data:image/svg+xml;base64,`svgo -o - assets/typescript-definitions.svg | base64`"

.PHONY:  doc test format format-check lint update-readme readme check-readme pre-publish publish
