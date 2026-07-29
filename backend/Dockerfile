FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm install --workspace=backend

COPY shared ./shared
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src

WORKDIR /app/backend

EXPOSE 4474

CMD ["npm", "run", "dev"]
