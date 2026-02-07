# Development stage
FROM golang:1.20 AS development
WORKDIR /app
COPY app/go.mod app/go.sum* ./
RUN if [ -f go.mod ]; then go mod download; fi
COPY app/ .
COPY db/migrations /app/migrations

# Add an entrypoint that ensures modules are downloaded inside the container at start
COPY app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["sh", "-c", "go run ."]

# Build stage
FROM golang:1.20-alpine AS build
WORKDIR /src
COPY app/go.mod app/go.sum ./
RUN go mod download
COPY app/ .
RUN go build -o /app/server ./

# Production stage
FROM alpine:3.18 AS production
COPY --from=build /app/server /server
COPY db/migrations /app/migrations
EXPOSE 8080
ENTRYPOINT ["/server"]
