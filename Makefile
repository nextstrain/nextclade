export UID=$(shell id -u)
export GID=$(shell id -g)

clean:
	rm -rf .build .out tmp

cleanest: clean
	rm -rf .cache

dev:
	@$(MAKE) --no-print-directory dev-impl

dev-impl:
	@nodemon

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
	@CMAKE_BUILD_TYPE=Release scripts/build_locally.sh

profile:
	@CMAKE_BUILD_TYPE=RelWithDebInfo scripts/build_locally.sh

benchmarks:
	@$(MAKE) --no-print-directory benchmarks-impl

benchmarks-impl:
	@nodemon --config nodemon.benchmarks.json

benchmarks-nowatch:
	@scripts/benchmarks.sh

format:
	@scripts/format.sh

clang-tidy:
	@scripts/clang-tidy.sh



# "Builder" docker container

# Pulls "Builder" docker container from Docker Hub
docker-builder-pull:
	./scripts/docker_builder_image_pull.sh

# Pushes "Builder" docker container to Docker Hub
docker-builder-push:
	./scripts/docker_builder_image_push.sh



# Builds and runs development container
docker-dev:
	./scripts/docker_builder_image_build.sh "developer"
	./scripts/docker_builder_image_run.sh "developer"

docker-builder:
	./scripts/docker_builder_image_build.sh "builder"

docker-builder-run:
	./scripts/docker_builder_image_run.sh "builder"

## Builds and runs "Builder" container
docker-prod: docker-builder docker-builder-run


# Checks if attempted release version is valid
check-release-version:
	scripts/check_release_version.sh

e2e-run:
	packages/nextclade/e2e/run.sh

e2e-compare:
	python3 packages/nextclade/e2e/compare_js_and_cpp.py

e2e: e2e-run e2e-compare
