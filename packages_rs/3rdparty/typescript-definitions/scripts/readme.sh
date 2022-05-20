#!/bin/bash
rustdoc --edition 2018 --crate-name typescript-definitions -o ./target/doc/typescript_definitions \
	--markdown-css ../normalize.css  \
	--markdown-css ../dark.css  \
	--html-before-content scripts/templates/before.html \
	--html-after-content scripts/templates/after.html \
	-L dependency=./target/debug/deps \
	-v README.md
