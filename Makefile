export UID=$(shell id -u)
export GID=$(shell id -g)

all:
	@echo "There is no default make target."
	@echo ""
	@echo "TL;DR:"
	@echo "  If you are just starting with Nextclade CLI, you probably need:"
	@echo ""
	@echo "    make dev"
	@echo ""
	@echo "  If you want to build Nextclade Web Application, you are probably looking for:"
	@echo ""
	@echo "    make dev-wasm"
	@echo "    make dev-web"
	@echo "  (in two separate terminal windows)"
	@echo ""
	@echo ""
	@echo ""
	@echo "List of most important make targets"
	@echo ""
	@echo "Nextclade and Nextalign CLI:"
	@echo ""
	@echo "  make dev                 Build and run Nextclade and Nextalign CLI in development mode (locally)"
	@echo "  make prod                Build and run Nextclade and Nextalign CLI in production mode (locally)"
	@echo ""
	@echo "  make docker-dev          Build and run Nextclade and Nextalign CLI in development mode (inside Docker container)"
	@echo "  make docker-prod         Build and run Nextclade and Nextalign CLI in production mode (inside Docker container)"
	@echo ""
	@echo "  make benchmarks          Build and run Nextclade and Nextalign benchmarks"
	@echo "  make profile             Build and run Nextclade and Nextalign with profiling"
	@echo "  make dev-valgrind        Build and run Nextclade and Nextalign with valgrind"
	@echo "  make dev-massif          Build and run Nextclade and Nextalign with massif"
	@echo "  make dev-asan            Build and run Nextclade and Nextalign CLI with Address Sanitizer"
	@echo "  make dev-msan            Build and run Nextclade and Nextalign CLI with Memory Sanitizer"
	@echo "  make dev-tsan            Build and run Nextclade and Nextalign CLI with Thread Sanitizer"
	@echo "  make dev-ubsan           Build and run Nextclade and Nextalign CLI with Undefined Behavior Sanitizer"
	@echo "  make dev-clang-analyzer  Build Nextclade and Nextalign CLI and run Clang Analyzer"
	@echo ""
	@echo "Nextclade Web Application and Nextclade WebAssembly module:"
	@echo ""
	@echo "  make dev-wasm            Build Nextclade WebAssembly module in development mode"
	@echo "  make prod-wasm           Build Nextclade WebAssembly module in production mode"
	@echo "  make dev-web             Build Nextclade Web Application and run development server"
	@echo "  make prod-web            Build Nextclade Web Application production bundle and run local static server"
	@echo ""
	@echo "General:"
	@echo "  make clean               Delete build artifacts"
	@echo "  make cleanest            Delete build artifacts, caches and installed dependencies"
	@echo ""

# General

clean: clean-cpp clean-web

cleanest: cleanest-cpp cleanest-web

clean-cpp:
	rm -rf .build .out .reports tmp

cleanest-cpp: clean-cpp
	rm -rf .cache

clean-web:
	rm -rf packages/web/.build packages/web/src/generated

cleanest-web: clean-web
	rm -rf packages/web/.cache



# CLI: Development build
dev:
	@$(MAKE) --no-print-directory dev-impl

dev-impl:
	@nodemon --config config/nodemon/nodemon.json

dev-nowatch:
	@scripts/build_locally.sh



# CLI: Production build
prod:
	@CMAKE_BUILD_TYPE=Release nodemon --config config/nodemon/nodemon.json

prod-nowatch:
	@CMAKE_BUILD_TYPE=Release scripts/build_locally.sh


# CLI: Development build (docker)
docker-dev: docker-developer-image-build
	./scripts/docker_builder_image_run.sh "developer" "make dev"


# CLI: Production build (docker)
docker-prod: docker-developer-image-build
	./scripts/docker_builder_image_run.sh "developer" "make prod"


# CLI: Static analysis

dev-clang-analyzer:
	@USE_CLANG_ANALYZER=1 scripts/build_locally.sh

dev-clang-tidy:
	@scripts/clang-tidy.sh

format:
	@scripts/format.sh


# CLI: Runtime analysis

dev-asan:
	@CMAKE_BUILD_TYPE=ASAN $(MAKE) dev

dev-msan:
	@CMAKE_BUILD_TYPE=MSAN USE_CLANG=1 $(MAKE) dev

dev-tsan:
	@CMAKE_BUILD_TYPE=TSAN $(MAKE) dev

dev-ubsan:
	@CMAKE_BUILD_TYPE=UBSAN $(MAKE) dev

dev-valgrind:
	@USE_VALGRIND=1 $(MAKE) dev

dev-massif:
	@USE_MASSIF=1 $(MAKE) dev


# CLI: Performance

benchmarks:
	@$(MAKE) --no-print-directory benchmarks-impl

benchmarks-impl:
	@nodemon --config config/nodemon/nodemon.benchmarks.json

benchmarks-nowatch:
	@scripts/benchmarks.sh

profile:
	@CMAKE_BUILD_TYPE=RelWithDebInfo scripts/build_locally.sh



# CLI: End-to-end tests

e2e-run:
	packages/nextclade/e2e/run.sh

e2e-compare:
	python3 packages/nextclade/e2e/compare_js_and_cpp.py

e2e: e2e-run e2e-compare







# WebAssembly: Debug build

# There is no dev build for wasm (it is too slow)
dev-wasm: prod-wasm

# WebAssembly: Release build

prod-wasm:
	@NEXTCLADE_BUILD_WASM=1 $(MAKE) --no-print-directory prod

prod-wasm-nowatch:
	@NEXTCLADE_BUILD_WASM=1 $(MAKE)  --no-print-directory prod-nowatch

# TODO: Not implemented
lint-wasm-nowatch:
	@echo ""


# WebAssembly: Development build (docker)
# There is no dev build for wasm (it is too slow)
docker-dev-wasm: docker-prod-wasm


# WebAssembly: Production build (docker)
docker-prod-wasm: docker-developer-image-build
	@NEXTCLADE_BUILD_WASM=1 scripts/docker_builder_image_run.sh "developer" "make prod-wasm"




# Web: Development build

dev-web:
	cd packages/web && yarn dev


# Web: Production build

prod-web:
	cd packages/web && yarn install && yarn prod:watch

prod-web-nowatch:
	cd packages/web && yarn install --frozen-lockfile && yarn prod:build


# Web: Static analysis

lint-web:
	cd packages/web && yarn install && yarn lint

lint-web-nowatch:
	cd packages/web && yarn install && yarn lint:ci


# Web: Development build (docker)
docker-dev-web: docker-developer-image-build
	scripts/docker_builder_image_run.sh "developer" "make dev-web"

# Web: Production build (docker)
docker-prod-web: docker-developer-image-build
	scripts/docker_builder_image_run.sh "developer" "make prod-web"




# Docker "builder" and "developer" images:

docker-builder-image-build:
	scripts/docker_builder_image_build.sh "builder"

docker-developer-image-build:
	scripts/docker_builder_image_build.sh "developer"




# Continuous Integration

ci-cli:
	make prod-nowatch

ci-web:
	make lint-wasm-nowatch
	make prod-wasm-nowatch
	make lint-web-nowatch
	make prod-web-nowatch

check-release-version:
	scripts/check_release_version.sh

check-circleci-config:
	circleci config process .circleci/config.yml
