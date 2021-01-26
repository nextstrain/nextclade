export UID=$(shell id -u)
export GID=$(shell id -g)

.PHONY: docker-prod

dev:
	@$(MAKE) --no-print-directory dev-impl

dev-impl:
	@nodemon

dev-nowatch:
	@scripts/build_locally.sh

dev-asan:
	@CMAKE_BUILD_TYPE=ASAN $(MAKE) dev

dev-msan:
	@CMAKE_BUILD_TYPE=MSAN $(MAKE) dev

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

docker-dev:
	mkdir -p .build/Debug .cache/docker/home/user/.conan/data
	UID=${UID} GID=${GID} docker-compose -f docker-compose.yml up --build


docker-prod: docker-prod-build docker-prod-run

docker-prod-build:
	UID=${UID} GID=${GID} docker-compose -f docker-compose.prod.yml build

docker-prod-run:
	mkdir -p .build/Release .cache/docker/home/user/.conan/data
	UID=${UID} GID=${GID} docker-compose -f docker-compose.prod.yml up --build

docker-cache-save:
	mkdir -p docker_images
	docker save -o docker_images/images.tar $(shell docker images -a -q)

docker-cache-load:
	docker load -i docker_images/images.tar || true

check-release-version:
	scripts/check_release_version.sh
