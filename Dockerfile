FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY src ./src
COPY public ./public
ARG VITE_APP_TITLE="EQIP Quality Platform"
ARG VITE_MOCK_DATA_VERSION="1.0.0"
ENV VITE_APP_TITLE=$VITE_APP_TITLE VITE_MOCK_DATA_VERSION=$VITE_MOCK_DATA_VERSION
RUN node node_modules/vite/bin/vite.js build

FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
