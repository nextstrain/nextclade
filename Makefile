-include .env.example
-include .env
export $(shell bash -c "sed 's/=.*//' .env.example || true" )
export $(shell bash -c "sed 's/=.*//' .env || true" )

export UID=$(shell id -u)
export GID=$(shell id -g)

SHELL:=bash
.ONESHELL:

.PHONY: docs docker-docs e2e

e2e: e2e-cli-run

e2e-cli-get-snapshots:
	e2e/cli/get_snapshots.sh

e2e-cli-run: e2e-cli-get-snapshots
	e2e/cli/test.sh

e2e-cli-update-snapshots:
	e2e/cli/update_snapshots.sh

e2e-run:
	packages/nextclade/e2e/run.sh

e2e-compare:
	python3 packages/nextclade/e2e/compare_js_and_cpp.py

e2e: e2e-run e2e-compare

# Documentation

docs:
	@$(MAKE) --no-print-directory -C docs/ html

docs-clean:
	rm -rf docs/build

.ONESHELL:
docker-docs:
	set -euox

	docker build -t nextclade-docs-builder \
	--network=host \
	--build-arg UID=$(shell id -u) \
	--build-arg GID=$(shell id -g) \
	docs/

	docker run -it --rm \
	--name=nextclade-docs-builder-$(shell date +%s) \
	--init \
	--user=$(shell id -u):$(shell id -g) \
	--volume=$(shell pwd):/workdir \
	--publish=8000:8000 \
	nextclade-docs-builder


.ONESHELL:
docker-paper:
	set -euox

	docker run -it --rm \
	--name=nextclade-paper-builder-$(shell date +%s) \
	--init \
	--user=$(shell id -u):$(shell id -g) \
	--volume=$(shell pwd)/paper:/data \
	--publish=8000:8000 \
	--workdir=/data \
	--env 'TERM=xterm-256colors' \
	--env 'JOURNAL=joss' \
	openjournals/paperdraft


paper-preprint:
	@set -euxo pipefail
	@cd paper/
	./scripts/build_preprint.sh

docker-paper-preprint:
	@set -euxo pipefail

	@export CONTAINER_IMAGE_NAME=nextclade-preprint-builder

	@docker build -t "$${CONTAINER_IMAGE_NAME}" \
	--network=host \
	paper/

	@docker run -it --rm \
	--init \
	--name="$${CONTAINER_IMAGE_NAME}-$(shell date +%s)" \
	--user="$(shell id -u):$(shell id -g)" \
	--volume="$(shell pwd):/home/user/src" \
	--workdir="/home/user/src" \
	--env "TERM=xterm-256colors" \
	"$${CONTAINER_IMAGE_NAME}" \
		bash -c "make paper-preprint"

# Synchronize source files using rsync
sync:
	@$(MAKE) --no-print-directory sync-impl

sync-impl:
	@nodemon --config config/nodemon/nodemon_sync.json

.ONESHELL:
sync-nowatch:
	rsync -arvz --no-owner --no-group --exclude=.git --exclude=.volumes --exclude=.idea --exclude=.vscode* --exclude=.ignore* --exclude=.cache --exclude=.build --exclude=packages/web/.build --exclude=packages/web/.cache --exclude=packages/web/node_modules --exclude=packages/nextclade_cli/src/generated --exclude=.out --exclude=tmp --exclude=.reports $(shell pwd) $${SYNC_DESTINATION}


update-clades-svg:
	@set -euo pipefail
	@export CLADES_SVG_SRC="https://raw.githubusercontent.com/nextstrain/ncov-clades-schema/master/clades.svg"
	@export CLADES_SVG_DST="packages/web/src/assets/img/clades.svg"
	@echo "Downloading clade schema from '$${CLADES_SVG_SRC}' to '$${CLADES_SVG_DST}'"
	curl -fsSL "$${CLADES_SVG_SRC}" -o "$${CLADES_SVG_DST}"
