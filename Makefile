-include .env.example
-include .env
export $(shell bash -c "sed 's/=.*//' .env.example || true" )
export $(shell bash -c "sed 's/=.*//' .env || true" )

export UID=$(shell id -u)
export GID=$(shell id -g)

SHELL:=bash
.ONESHELL:

.PHONY: docs docs-clean docker-docs docker-paper paper-preprint docker-paper-preprint clean distclean


######################## Docs #################################################

docs:
	@$(MAKE) --no-print-directory -C docs/ html

docs-clean:
	rm -rf $(CURDIR)/docs/build

.ONESHELL:
docker-docs:
	@set -euox

	@docker build -t nextclade-docs-builder \
	--network=host \
	--build-arg UID=$(shell id -u) \
	--build-arg GID=$(shell id -g) \
	docs/

	@docker run -it --rm \
	--name=nextclade-docs-builder-$(shell date +%s) \
	--init \
	--user=$(shell id -u):$(shell id -g) \
	--volume=$(shell pwd):/workdir \
	--publish=8000:8000 \
	nextclade-docs-builder


######################## Paper ################################################

.ONESHELL:
docker-paper:
	@set -euox

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
	@./scripts/build_preprint.sh

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
	--ulimit core=0 \
	"$${CONTAINER_IMAGE_NAME}" \
		bash -c "make paper-preprint"


######################## Clean ################################################

clean:
	rm -rf $(CURDIR)/docs/build
	rm -rf $(CURDIR)/.cache
	rm -rf $(CURDIR)/.build
	rm -rf $(CURDIR)/.out $(CURDIR)/.temp $(CURDIR)/.tmp
	rm -rf $(CURDIR)/packages/nextclade-web/.cache
	rm -rf $(CURDIR)/packages/nextclade-web/.build
	rm -rf $(CURDIR)/packages/nextclade-web/.next
	rm -rf $(CURDIR)/packages/nextclade-web/.eslintcache
	rm -rf $(CURDIR)/packages/nextclade-web/src/gen
	rm -rf $(CURDIR)/packages/nextclade-web/test-results
	rm -rf $(CURDIR)/packages/nextclade-web/playwright-report
	find $(CURDIR) -name '*.log' -not -path '$(CURDIR)/target/*' -not -path '*/node_modules/*' -delete
	find $(CURDIR) -name '*.tsbuildinfo' -not -path '$(CURDIR)/target/*' -not -path '*/node_modules/*' -delete
	find $(CURDIR) -name '.DS_Store' -delete
	find $(CURDIR) -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
	find $(CURDIR) -name '.pytest_cache' -type d -exec rm -rf {} + 2>/dev/null || true

distclean: clean
	rm -rf $(CURDIR)/target
	rm -rf $(CURDIR)/packages/*/target
	rm -rf $(CURDIR)/packages/nextclade-web/node_modules
