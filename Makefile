export UID=$(shell id -u)
export GID=$(shell id -g)

# Cleanup
# 	"clean":  remove build artifacts
# 	"cleanest": remove build artifacts, caches and installed dependencies

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


# Command-line tools
dev:
	@$(MAKE) --no-print-directory dev-impl

dev-impl:
	@nodemon --config config/nodemon/nodemon.json

dev-nowatch:
	@scripts/build_locally.sh

dev-asan:
	@CMAKE_BUILD_TYPE=ASAN $(MAKE) dev

dev-msan:
	@CMAKE_BUILD_TYPE=MSAN USE_CLANG=1 $(MAKE) dev

dev-tsan:
	@CMAKE_BUILD_TYPE=TSAN $(MAKE) dev

dev-ubsan:
	@CMAKE_BUILD_TYPE=UBSAN $(MAKE) dev

dev-clang-analyzer:
	@USE_CLANG_ANALYZER=1 scripts/build_locally.sh

prod:
	@CMAKE_BUILD_TYPE=Release nodemon --config config/nodemon/nodemon.json

prod-nowatch:
	@CMAKE_BUILD_TYPE=Release scripts/build_locally.sh

profile:
	@CMAKE_BUILD_TYPE=RelWithDebInfo scripts/build_locally.sh

benchmarks:
	@$(MAKE) --no-print-directory benchmarks-impl

benchmarks-impl:
	@nodemon --config config/nodemon/nodemon.benchmarks.json

benchmarks-nowatch:
	@scripts/benchmarks.sh

format:
	@scripts/format.sh

clang-tidy:
	@scripts/clang-tidy.sh



# WebAssembly

# There is no dev build for wasm (it is too slow)
dev-wasm: prod-wasm

prod-wasm:
	@NEXTCLADE_BUILD_WASM=1 $(MAKE) --no-print-directory dev

prod-wasm-nowatch:
	@NEXTCLADE_BUILD_WASM=1 $(MAKE)  --no-print-directory prod

# Web

dev-web:
	cd packages/web && yarn dev

prod-web:
	cd packages/web && yarn install && yarn prod:watch

prod-web-nowatch:
	cd packages/web && yarn install --frozen-lockfile && yarn prod:build



# Docker-based builds

# Pulls "Builder" docker container from Docker Hub
docker-builder-pull:
	./scripts/docker_builder_image_pull.sh

# Pushes "Builder" docker container to Docker Hub
docker-builder-push:
	./scripts/docker_builder_image_push.sh



# Builds and runs development container
docker-dev:
	./scripts/docker_builder_image_build.sh "developer"
	./scripts/docker_builder_image_run.sh "developer" "make dev"

# Builds and runs development container for wasm
docker-dev-wasm:
	scripts/docker_builder_image_build.sh "developer"
	@NEXTCLADE_BUILD_WASM=1 ./scripts/docker_builder_image_run.sh "developer" "make prod"

docker-builder:
	./scripts/docker_builder_image_build.sh "builder"

docker-builder-run:
	./scripts/docker_builder_image_run.sh "builder" "make prod-nowatch"

docker-builder-run-wasm:
	@NEXTCLADE_BUILD_WASM=1 ./scripts/docker_builder_image_run.sh "builder" "make prod-nowatch"

docker-builder-web:
	./scripts/docker_builder_image_build.sh "web"

docker-builder-run-web:
	./scripts/docker_builder_image_run.sh "web" "make prod-web-nowatch"

docker-prod: docker-builder docker-builder-run

docker-prod-wasm: docker-builder docker-builder-run-wasm

docker-prod-web: docker-builder-web docker-builder-run-wasm docker-builder-run-web

# Checks if attempted release version is valid
check-release-version:
	scripts/check_release_version.sh

e2e-run:
	packages/nextclade/e2e/run.sh

e2e-compare:
	python3 packages/nextclade/e2e/compare_js_and_cpp.py

e2e: e2e-run e2e-compare


# TODO: Not implemented
lint-wasm-nowatch:
	echo ""

lint-web-nowatch:
	cd packages/web && yarn install && yarn lint:ci

make prod-wasm-ci: lint-wasm-nowatch prod-wasm-nowatch

make prod-web-ci: lint-web-nowatch prod-web-nowatch

