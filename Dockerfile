FROM node:20-slim

WORKDIR /app

# Installer dépendances système minimales
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dépendances
COPY package*.json ./

# Installation optimisée Railway (faible RAM)
RUN npm ci --omit=dev --no-audit --no-fund --prefer-offline

# Copier le reste
COPY . .

ENV PORT=3210
EXPOSE 3210

CMD ["node", "server/server-firebase.js"]