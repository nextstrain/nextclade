-include .env.example
-include .env
export $(shell bash -c "sed 's/=.*//' .env.example || true" )
export $(shell bash -c "sed 's/=.*//' .env || true" )

export UID=$(shell id -u)
export GID=$(shell id -g)

SHELL := bash
.ONESHELL:

.PHONY: docs docker-docs e2e

clean:
	@set -euxo pipefail
	rm -rf .build .out tmp packages/nextclade_cli/src/generated packages/nextalign_cli/src/generated packages/web/.build packages/web/src/generated

cleanest: clean
	@set -euxo pipefail
	rm -rf .cache packages/web/.cache


# Command-line tools

dev:
	@set -euxo pipefail
	@$(MAKE) --no-print-directory dev-impl

dev-impl:
	@set -euxo pipefail
	@./dev-local wr

dev-nowatch:
	@set -euxo pipefail
	@./dev-local r

dev-asan:
	@set -euxo pipefail
	@CMAKE_BUILD_TYPE=ASAN $(MAKE) dev

dev-msan:
	@set -euxo pipefail
	@CMAKE_BUILD_TYPE=MSAN USE_CLANG=1 $(MAKE) dev

dev-tsan:
	@set -euxo pipefail
	@CMAKE_BUILD_TYPE=TSAN $(MAKE) dev

dev-ubsan:
	@set -euxo pipefail
	@CMAKE_BUILD_TYPE=UBSAN $(MAKE) dev

dev-clang-analyzer:
	@set -euxo pipefail
	@USE_CLANG_ANALYZER=1 scripts/build_locally.sh

prod:
	@set -euxo pipefail
	@./dev-local rr

prod-watch:
	@set -euxo pipefail
	@./dev-local wrr

profile:
	@set -euxo pipefail
	@CMAKE_BUILD_TYPE=RelWithDebInfo scripts/build_locally.sh

benchmarks:
	@set -euxo pipefail
	@$(MAKE) --no-print-directory benchmarks-impl

benchmarks-impl:
	@set -euxo pipefail
	@nodemon --config nodemon.benchmarks.json

benchmarks-nowatch:
	@set -euxo pipefail
	@scripts/benchmarks.sh

format:
	@set -euxo pipefail
	@scripts/format.sh

clang-tidy:
	@set -euxo pipefail
	@scripts/clang-tidy.sh



# WebAssembly

# There is no dev build for wasm
dev-wasm: prod-wasm

prod-wasm:
	@set -euxo pipefail
	@./dev-local wr --wasm

prod-wasm-nowatch:
	@set -euxo pipefail
	@./dev-local r --wasm

# Web

dev-web:
	@set -euxo pipefail
	cd packages/web && yarn dev

serve-data:
	@set -euxo pipefail
	cd packages/web && yarn serve-data

prod-web:
	@set -euxo pipefail
	cd packages/web && yarn install && yarn prod:watch

prod-web-nowatch:
	@set -euxo pipefail
	cd packages/web && yarn install --frozen-lockfile && yarn prod:build

lint-web:
	@set -euxo pipefail
	cd packages/web && yarn install --frozen-lockfile && yarn lint:ci

# Docker-based builds

# Pulls "Builder" docker container from Docker Hub
docker-builder-pull:
	@set -euxo pipefail
	./scripts/docker_builder_image_pull.sh

# Pushes "Builder" docker container to Docker Hub
docker-builder-push:
	@set -euxo pipefail
	./scripts/docker_builder_image_push.sh



# Builds and runs development container
docker-dev:
	@set -euxo pipefail
	./scripts/docker_builder_image_build.sh
	./scripts/docker_builder_image_run.sh "make dev"

# Builds and runs development container for wasm
docker-dev-wasm:
	@set -euxo pipefail
	scripts/docker_builder_image_build.sh
	@NEXTCLADE_BUILD_WASM=1 ./scripts/docker_builder_image_run.sh "make prod-watch"

docker-builder:
	@set -euxo pipefail
	./scripts/docker_builder_image_build.sh

docker-builder-run:
	@set -euxo pipefail
	./scripts/docker_builder_image_run.sh "make prod"

docker-builder-run-wasm:
	@set -euxo pipefail
	@NEXTCLADE_BUILD_WASM=1 ./scripts/docker_builder_image_run.sh "make prod"

docker-builder-web:
	@set -euxo pipefail
	./scripts/docker_builder_image_build.sh

docker-builder-run-web:
	@set -euxo pipefail
	./scripts/docker_builder_image_run.sh "make prod-web-nowatch"

docker-prod: docker-builder docker-builder-run

docker-prod-wasm: docker-builder docker-builder-run-wasm

docker-prod-web: docker-builder-web docker-builder-run-wasm docker-builder-run-web

# Checks if attempted release version is valid
check-release-version:
	scripts/check_release_version.sh

e2e: e2e-cli-run

e2e-cli-get-snapshots:
	@set -euxo pipefail
	e2e/cli/get_snapshots.sh

e2e-cli-run: e2e-cli-get-snapshots
	@set -euxo pipefail
	e2e/cli/test.sh

e2e-cli-update-snapshots:
	@set -euxo pipefail
	e2e/cli/update_snapshots.sh

e2e-run:
	@set -euxo pipefail
	packages/nextclade/e2e/run.sh

e2e-compare:
	@set -euxo pipefail
	python3 packages/nextclade/e2e/compare_js_and_cpp.py

e2e: e2e-run e2e-compare

# Documentation

docs:
	@set -euxo pipefail
	@$(MAKE) --no-print-directory -C docs/ html

docs-clean:
	@set -euxo pipefail
	rm -rf docs/build

.ONESHELL:
docker-docs:
	@set -euxo pipefail

	docker build -t nextclade-docs-builder \
	--network=host \
	--build-arg UID=$(shell id -u) \
	--build-arg GID=$(shell id -g) \
	docs/

	docker run -it --rm \
	--name=nextclade-docs-builder-$(shell date +%s) \
	--init \
	--user=$(shell id -u):$(shell id -g) \
	--volume=$(shell pwd):/home/user/src \
	--publish=8000:8000 \
	--workdir=/home/user/src \
	--env 'TERM=xterm-256colors' \
	nextclade-docs-builder


.ONESHELL:
docker-paper:
	@set -euxo pipefail

	@docker run -it --rm \
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
	@set -euxo pipefail
	@$(MAKE) --no-print-directory sync-impl

sync-impl:
	@set -euxo pipefail
	@nodemon --config config/nodemon/nodemon_sync.json

.ONESHELL:
sync-nowatch:
	@set -euxo pipefail
	rsync -arvz --no-owner --no-group --exclude=.git --exclude=.volumes --exclude=.idea --exclude=.vscode* --exclude=.ignore* --exclude=.cache --exclude=.build --exclude=packages/web/.build --exclude=packages/web/.cache --exclude=packages/web/node_modules --exclude=packages/nextclade_cli/src/generated --exclude=.out --exclude=tmp --exclude=.reports $(shell pwd) $${SYNC_DESTINATION}


update-clades-svg:
	@set -euo pipefail
	@export CLADES_SVG_SRC="https://raw.githubusercontent.com/nextstrain/ncov-clades-schema/master/clades.svg"
	@export CLADES_SVG_DST="packages/web/src/assets/img/clades.svg"
	@echo "Downloading clade schema from '$${CLADES_SVG_SRC}' to '$${CLADES_SVG_DST}'"
	curl -fsSL "$${CLADES_SVG_SRC}" -o "$${CLADES_SVG_DST}"
