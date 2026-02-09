.PHONY: extension rebuild-extension build-extension build-extension-nocache clean-extension build-backend-nocache start-backend stop-backend restart-backend dev help

help:
	@echo "Available targets:"
	@echo "  rebuild-extension   - Clean extension dist and rebuild extension via Docker"
	@echo "  build-extension   - Build extension via Docker"
	@echo "  clean-extension   - Clean extension dist directory"
	@echo "  build-backend-clean  - Rebuild (no-cache) backed in Docker"
	@echo "  start-backend     - Start backend and MongoDB via Docker"
	@echo "  stop-backend      - Stop backend and MongoDB containers"
	@echo "  restart-backend   - Restart backend and MongoDB containers"
	@echo "  dev              - Start backend and build extension"
	@echo "  logs-backend     - View backend logs"

extension:
	docker compose run --rm extension-build

build-extension:
	docker compose --profile build build extension-build

build-extension-nocache:
	docker compose --profile build build --no-cache extension-build

rebuild-extension: clean-extension build-extension-nocache extension

clean-extension:
	rm -rf extension/dist
	mkdir extension/dist

build-backend-nocache:
	docker compose build --no-cache tabbycat-backend

start-backend:
	docker compose up -d tabbycat-mongodb tabbycat-backend
	@echo "Backend starting at http://localhost:3000"
	@echo "MongoDB available at mongodb://localhost:27017"

stop-backend:
	docker compose down


restart-backend:
	docker compose restart tabbycat-backend

rebuild-backend: build-backend-nocache restart-backend

dev: start-backend extension
	@echo "Development environment ready!"
	@echo "Load extension from extension/dist/ directory"
