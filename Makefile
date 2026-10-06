# Everyday commands. Run `make` (or `make help`) to list them.
# Each target is a thin wrapper over npm scripts, so both ways keep working.

PORT ?= 8080
APPS := $(notdir $(wildcard apps/*))

.DEFAULT_GOAL := help
.PHONY: help install dev dev-hexmapper dev-oracle dev-travel dev-manual dev-all build site serve preview \
	test test-watch check lint format verify clean private-status private-commit private-push

help: ## List the commands
	@awk 'BEGIN {FS = ":.*## "; printf "OpenTabletop\n\n"} \
		/^[a-zA-Z_-]+:.*## / {printf "  \033[33mmake %-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\nApps: $(APPS). Variables: PORT=$(PORT) (make serve PORT=9000)\n"

install: ## Install dependencies (after cloning or pulling)
	npm install

dev: dev-hexmapper ## Run the hexmapper with live reload (same as dev-hexmapper)

dev-hexmapper: ## Run the hexmapper with live reload
	npm run dev -w apps/hexmapper

dev-oracle: ## Run the Oracle app with live reload
	npm run dev -w apps/oracle

dev-travel: ## Run the Travel app with live reload
	npm run dev -w apps/travel

dev-manual: ## Run the Manual app with live reload
	npm run dev -w apps/manual

dev-all: ## Run every app with live reload (Ctrl+C stops them all)
	@trap 'kill 0' INT TERM; \
	for app in $(APPS); do npm run dev -w apps/$$app & done; wait

build: ## Build every app into apps/<app>/dist/
	npm run build

site: ## Build every app together into dist/<app>/ (one site: apps share user packs)
	npm run build:site

serve: site ## Build the site and serve it (http://localhost:8080/<app>/, PORT=… to change)
	@echo "Open http://localhost:$(PORT)/hexmapper/, /oracle/, /travel/ or /manual/ (Ctrl+C to stop)"
	python3 -m http.server $(PORT) -d dist

preview: ## Serve the last built site again without rebuilding
	@echo "Open http://localhost:$(PORT)/hexmapper/, /oracle/, /travel/ or /manual/ (Ctrl+C to stop)"
	python3 -m http.server $(PORT) -d dist

test: ## Run the tests once
	npm test

test-watch: ## Run the tests on every change
	npm run test:watch

check: ## Type-check every package and app
	npm run check

lint: ## ESLint and Prettier (no changes)
	npm run lint

format: ## Format every file with Prettier
	npm run format

verify: lint check test ## Everything CI would run: lint, types and tests

clean: ## Remove build output (dist folders)
	rm -rf dist $(addprefix apps/,$(addsuffix /dist,$(APPS)))

private-status: ## Show changes in the private packs repo (packs-private/)
	git -C packs-private status --short

private-push: ## Push packs-private/ commits to its private GitHub repo
	git -C packs-private push

private-commit: ## Commit every change in packs-private/ (make private-commit MSG="…")
	@test -n "$(MSG)" || (echo 'Usage: make private-commit MSG="what changed"' && exit 1)
	git -C packs-private add -A && git -C packs-private commit -m "$(MSG)"
