FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm install --workspace=backend

COPY shared ./shared
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src

# The seed endpoint reads this at runtime, resolved relative to the repo root.
COPY documents/sample_articles.json ./documents/sample_articles.json

WORKDIR /app/backend

EXPOSE 4474

CMD ["npm", "run", "dev"]
