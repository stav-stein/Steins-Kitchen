# Client build
FROM node:20-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json ./client/
COPY client ./client
RUN npm ci --prefix client && npm run build --prefix client

# Runtime: API + static SPA
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server --omit=dev
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server/index.js"]
