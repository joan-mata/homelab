.PHONY: reload restart up down status logs validate help

SHELL := /bin/bash

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

reload: ## Recarga conf.d sin downtime (cambios en .conf)
	@bash deploy.sh reload

restart: ## Recrea el contenedor (cambios en docker-compose)
	@bash deploy.sh restart

up: ## Levanta el stack completo
	@bash deploy.sh up

down: ## Para el stack (pide confirmación)
	@bash deploy.sh down

status: ## Estado de los contenedores
	@bash deploy.sh status

logs: ## Logs en tiempo real
	@bash deploy.sh logs

validate: ## Valida la config nginx sin aplicar cambios
	@bash deploy.sh validate
