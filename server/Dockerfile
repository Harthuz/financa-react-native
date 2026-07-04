FROM node:20-alpine

WORKDIR /app

# Copia manifesto e lockfile para instalação determinística
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production

# Roda como usuário não-root por segurança
USER node

EXPOSE 3001

CMD ["node", "src/index.js"]
