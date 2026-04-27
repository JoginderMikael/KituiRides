FROM node:20-alpine AS build
WORKDIR /app
ARG BUILD_VITE_GOOGLE_MAPS_API_KEY
COPY package*.json ./
RUN npm install
COPY . .
RUN if [ -n "$BUILD_VITE_GOOGLE_MAPS_API_KEY" ]; then \
      export VITE_GOOGLE_MAPS_API_KEY="$BUILD_VITE_GOOGLE_MAPS_API_KEY"; \
    fi && \
    npm run build

FROM nginx:stable-alpine
RUN apk add --no-cache curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD curl -f http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
