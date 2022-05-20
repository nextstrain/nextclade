

test: update-readme
	@cargo test --all
doc: update-readme
	@rm -rf target/doc
	@cargo doc --no-deps --open --features="external_doc"
	# ./scripts/readme.sh

format: update-readme
	@rustup component add rustfmt 2> /dev/null
	@cargo fmt

format-check: update-readme
	@rustup component add rustfmt 2> /dev/null
	@cargo fmt -- --check

lint: update-readme
	@rustup component add clippy 2> /dev/null
	@cargo clippy

update-readme: README.md

README.md: src/lib.rs
	@cargo readme > README.md

pre-publish: update-readme test format-check lint

publish: pre-publish
	@cargo publish

.PHONY:  doc test format format-check lint update-readme check-readme pre-publish publish
