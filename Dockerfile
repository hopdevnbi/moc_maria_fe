FROM node:22.23.1-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22.23.1-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.23.1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package*.json ./
USER node
EXPOSE 3001
CMD ["npm", "start"]