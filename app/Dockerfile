# Development stage
FROM golang:1.20 AS development
WORKDIR /app
COPY go.mod go.sum* ./
RUN if [ -f go.mod ]; then go mod download; fi
COPY . .

# Add an entrypoint that ensures modules are downloaded inside the container at start
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["sh", "-c", "go run ."]

# Build stage
FROM golang:1.20-alpine AS build
WORKDIR /src
COPY go.mod .
COPY . .
RUN go build -o /app/server ./

# Production stage
FROM alpine:3.18 AS production
COPY --from=build /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
