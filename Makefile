.PHONY: dev build test lint migrate clean docker-up docker-down

dev:
	docker compose -f docker-compose.dev.yml up

build:
	docker compose -f docker-compose.yml build

test:
	pytest backend/tests
	cd frontend && npm run test:unit

lint:
	flake8 backend
	cd frontend && npm run lint

migrate:
	docker compose exec backend alembic upgrade head

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf frontend/dist
