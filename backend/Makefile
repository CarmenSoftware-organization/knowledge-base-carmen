.PHONY: run dev build migrate-up migrate-down migrate-create test clean

# Run the application
run:
	@echo "Starting server..."
	go run cmd/server/main.go

# Run with hot reload (ต้องติดตั้ง air: go install github.com/air-verse/air@latest)
dev:
	air

# Build the application
build:
	go build -o bin/server cmd/server/main.go

# Run migrations up
migrate-up:
	migrate -path migrations -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)" up

# Run migrations down
migrate-down:
	migrate -path migrations -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)" down 1

# Create new migration
migrate-create:
	migrate create -ext sql -dir migrations -seq $(name)

# Run tests (tests live in backend/tests/)
test:
	go test ./tests/... -v

# Run tests with coverage
test-coverage:
	go test ./tests/... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	rm -rf bin/
	go clean

# Install dependencies
deps:
	go mod download
	go mod tidy
