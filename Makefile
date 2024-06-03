# Magnify's Makefile
#
# /!\ /!\ /!\ /!\ /!\ /!\ /!\ DISCLAIMER /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\
#
# This Makefile is only meant to be used for DEVELOPMENT purpose as we are
# changing the user id that will run in the container.
#
# PLEASE DO NOT USE IT FOR YOUR CI/PRODUCTION/WHATEVER...
#
# /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\ /!\
#
# Note to developpers:
#
# While editing this file, please respect the following statements:
#
# 1. Every variable should be defined in the ad hoc VARIABLES section with a
#    relevant subsection
# 2. Every new rule should be defined in the ad hoc RULES section with a
#    relevant subsection depending on the targeted service
# 3. Rules should be sorted alphabetically within their section
# 4. When a rule has multiple dependencies, you should:
#    - duplicate the rule name to add the help string (if required)
#    - write one dependency per line to increase readability and diffs
# 5. .PHONY rule statement should be written after the corresponding rule

# ==============================================================================
# VARIABLES

# -- Database
# Database engine switch: if the DB_HOST=mysql environment variable is defined,
# we'll use the mysql docker-compose service as a database backend instead of
# postgresql (default).
ifeq ($(DB_HOST), mysql)
  DB_PORT            = 3306
else
  DB_HOST            = postgresql
  DB_PORT            = 5432
endif

# -- Docker
# Get the current user ID to use for docker run and docker exec commands
DOCKER_UID           = $(shell id -u)
DOCKER_GID           = $(shell id -g)
DOCKER_USER          = $(DOCKER_UID):$(DOCKER_GID)
COMPOSE              = DOCKER_USER=$(DOCKER_USER) DB_HOST=$(DB_HOST) DB_PORT=$(DB_PORT) docker compose
COMPOSE_RUN          = $(COMPOSE) run --rm
COMPOSE_EXEC         = $(COMPOSE) exec
COMPOSE_EXEC_APP     = $(COMPOSE_EXEC) app
COMPOSE_EXEC_NODE    = $(COMPOSE_EXEC) node
COMPOSE_RUN_APP      = $(COMPOSE_RUN) app
COMPOSE_RUN_CROWDIN  = $(COMPOSE_RUN) crowdin crowdin
COMPOSE_TEST_RUN     = $(COMPOSE) run --rm -e DJANGO_CONFIGURATION=Test
COMPOSE_TEST_RUN_APP = $(COMPOSE_TEST_RUN) app

PYTHON_FILES         = src/magnify/apps sandbox

# -- Django
MANAGE               = $(COMPOSE_RUN_APP) python sandbox/manage.py
WAIT_DB              = $(COMPOSE_RUN) dockerize -wait tcp://$(DB_HOST):$(DB_PORT) -timeout 60s
WAIT_APP             = $(COMPOSE_RUN) dockerize -wait tcp://app:8000 -timeout 60s
WAIT_KC_DB           = $(COMPOSE_RUN) dockerize -wait tcp://kc_postgresql:5432 -timeout 60s
WAIT_LIVEKIT         = $(COMPOSE_RUN) dockerize -wait http://livekit:7880 -timeout 60s

# ==============================================================================
# RULES

default: help

# -- Project
bootstrap: ## Install development dependencies
bootstrap: \
  env.d/crowdin \
  data/media/.keep \
  data/smedia/.keep \
  data/static/.keep \
  install-front \
  build \
  run \
  migrate \
  superuser
.PHONY: bootstrap

# -- Docker/compose
build: ## Build the app container
	@$(COMPOSE) build app
	@$(COMPOSE) build app-demo
.PHONY: build

down: ## Remove stack (warning: it removes the database container)
	@$(COMPOSE) down
.PHONY: down

logs: ## Display app logs (follow mode)
	@$(COMPOSE) logs -f app
.PHONY: logs

run: ## Start the production and development servers
	@$(COMPOSE) up -d app
	@$(COMPOSE) up -d nginx
	@$(COMPOSE) up -d livekit
	@$(COMPOSE) up -d keycloak
	@echo "Wait for services to be up..."
	@$(WAIT_KC_DB)
	@$(WAIT_DB)
	@$(WAIT_LIVEKIT)
	@$(WAIT_APP)
.PHONY: run

run-dev: ## Start the development servers
	@$(COMPOSE) up -d app
	@$(COMPOSE) up -d livekit
	@$(COMPOSE) up -d keycloak
	@echo "Wait for services to be up..."
	@$(WAIT_KC_DB)
	@$(WAIT_DB)
	@$(WAIT_LIVEKIT)
	@$(WAIT_APP)
.PHONY: run-dev

dev: ## Start the development servers, including the frontend live-reload server
dev: \
  run-dev \
  run-front
.PHONY: dev

status: ## An alias for "docker compose ps"
	@$(COMPOSE) ps
.PHONY: status

stop: ## Stop the development server
	@$(COMPOSE) stop
.PHONY: stop

# -- Front-end
install-front: ## Install frontend
	@$(COMPOSE_RUN) -e HOME="/tmp" node yarn install

build-front: ## Build frontend for each package
build-front:
	@$(COMPOSE_RUN) -e HOME="/tmp" -w /app/src/frontend node yarn install
	@$(COMPOSE_RUN) -e HOME="/tmp" -w /app/src/frontend node yarn build

run-front: ## start frontend development server with live reload
run-front:
	@$(COMPOSE_RUN) -e HOME="/tmp" -w /app/src/frontend node yarn install
	@$(COMPOSE_RUN) -e HOME="/tmp" -w /app/src/frontend -p 3200:3200 node yarn dev

test-front: ## Test frontend for each package
test-front:
	@$(COMPOSE_RUN) -e HOME="/tmp" -w /app/src/frontend node yarn test
.PHONY:test-front

lint-front: ## Run all front-end "linters"
lint-front: \
  lint-front-eslint \
  lint-front-prettier
.PHONY: lint-front

lint-front-prettier: ## Run prettier over js/jsx/json/ts/tsx files -- beware! overwrites files
	@$(COMPOSE_RUN) -e HOME="/tmp" node yarn format:write
.PHONY: lint-front-prettier

lint-front-eslint: ## Lint TypeScript sources
	@$(COMPOSE_RUN) -e HOME="/tmp" node yarn lint
.PHONY: lint-front-eslint

# -- Back-end
compilemessages: ## Compile the gettext files
	@$(COMPOSE_RUN) -w /app/src/magnify app python /app/sandbox/manage.py compilemessages
.PHONY: compilemessages

# Nota bene: Black should come after isort just in case they don't agree...
lint-back: ## lint back-end python sources
lint-back: \
  lint-back-isort \
  lint-back-black \
  lint-back-flake8 \
  lint-back-pylint \
  lint-back-bandit
.PHONY: lint-back

lint-back-diff: ## Lint back-end python sources, but only what has changed since master
	@bin/lint-back-diff
.PHONY: lint-back-diff

lint-back-black: ## Lint back-end python sources with black
	@echo 'lint:black started…'
	@$(COMPOSE_TEST_RUN_APP) black .
.PHONY: lint-back-black

lint-back-flake8: ## Lint back-end python sources with flake8
	@echo 'lint:flake8 started…'
	@$(COMPOSE_TEST_RUN_APP) flake8 ${PYTHON_FILES} tests
.PHONY: lint-back-flake8

lint-back-isort: ## Automatically re-arrange python imports in back-end code base
	@echo 'lint:isort started…'
	@$(COMPOSE_TEST_RUN_APP) isort --atomic ${PYTHON_FILES} tests
.PHONY: lint-back-isort

lint-back-pylint: ## Lint back-end python sources with pylint
	@echo 'lint:pylint started…'
	@$(COMPOSE_TEST_RUN_APP) pylint ${PYTHON_FILES} tests
.PHONY: lint-back-pylint

lint-back-bandit: ## Lint back-end python sources with bandit
	@echo 'lint:bandit started…'
	@$(COMPOSE_TEST_RUN_APP) bandit -qr ${PYTHON_FILES}
.PHONY: lint-back-bandit

messages: ## Create the .po files used for i18n
	@$(COMPOSE_RUN) -w /app/src/magnify app python /app/sandbox/manage.py makemessages --keep-pot
.PHONY: messages

migrate: ## Perform database migrations
	@$(COMPOSE) up -d ${DB_HOST}
	@$(WAIT_DB)
	@$(MANAGE) migrate
.PHONY: migrate

superuser: ## Create an admin user with password "admin"
	@$(COMPOSE) up -d mysql
	@echo "Wait for services to be up..."
	@$(WAIT_DB)
	@$(MANAGE) shell -c "from magnify.apps.core.models import User; not User.objects.filter(username='admin').exists() and User.objects.create_superuser('admin', 'admin@example.com', 'admin')"
.PHONY: superuser

test-back: ## Run back-end tests
	@DB_PORT=$(DB_PORT) bin/pytest
.PHONY: test-back

# -- Internationalization
crowdin-download: ## Download translated message from Crowdin
	@$(COMPOSE_RUN_CROWDIN) download -c crowdin/config.yml
.PHONY: crowdin-download

crowdin-upload: ## Upload source translations to Crowdin
	@$(COMPOSE_RUN_CROWDIN) upload sources -c crowdin/config.yml
.PHONY: crowdin-upload

i18n-compile: ## Compile translated messages to be used by all applications
i18n-compile: \
  i18n-compile-back \
  i18n-compile-front
.PHONY: i18n-compile

i18n-compile-back:
	@$(COMPOSE_RUN) -w /app/src/magnify app python /app/sandbox/manage.py compilemessages
.PHONY: i18n-compile-back

i18n-compile-front: ## Compile translated messages for all frontend packages
	@$(COMPOSE_RUN) -e HOME="/tmp" -w /app/src/frontend node yarn compile-translations
.PHONY: i18n-compile-front

i18n-download-and-compile: ## Download all translated messages and compile them to be used by all applications
i18n-download-and-compile: \
  crowdin-download \
  i18n-compile
.PHONY: i18n-download-and-compile

i18n-generate: ## Generate source translations files for all applications
i18n-generate: \
  i18n-generate-back \
  i18n-generate-front ## Generate source translations files for all applications
.PHONY: i18n-generate

i18n-generate-and-upload: ## Generate source translations for all applications and upload then to crowdin
i18n-generate-and-upload: \
  i18n-generate \
  crowdin-upload
.PHONY: i18n-generate-and-upload

i18n-generate-back:
	@$(COMPOSE_RUN) -w /app/src/magnify app python /app/sandbox/manage.py makemessages --ignore "venv/**/*" --keep-pot --all
.PHONY: i18n-generate-back

i18n-generate-front: ## Extract strings to be translated from the code of all frontend packages
	@$(COMPOSE_RUN) -e HOME="/tmp" -w /app/src/frontend node yarn extract-translations
.PHONY: i18n-generate-front

# -- Misc
clean: ## Restore repository state as it was freshly cloned
	git clean -idx
.PHONY: clean

env.d/crowdin:
	cp env.d/crowdin.dist env.d/crowdin

data/media/.keep:
	@echo 'Preparing media volume...'
	@mkdir -p data/media/
	@touch data/media/.keep

data/smedia/.keep:
	@echo 'Preparing secure media volume...'
	@mkdir -p data/smedia/
	@touch data/smedia/.keep

data/static/.keep:
	@echo 'Preparing static volume...'
	@mkdir -p data/static
	@touch data/static/.keep

help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
.PHONY: help
