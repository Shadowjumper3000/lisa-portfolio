# Development stage
FROM node:18 AS development
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
COPY . .
RUN npm ci --omit=dev || npm install
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# allow runtime substitution of env vars into nginx config
RUN apk add --no-cache gettext
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
