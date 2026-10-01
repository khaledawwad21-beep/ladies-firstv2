FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/

RUN cd backend && npm ci --omit=dev

COPY backend ./backend

ENV NODE_ENV=production

WORKDIR /app/backend

EXPOSE 10000

CMD ["npm", "start"]
