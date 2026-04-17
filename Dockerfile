FROM node:18-alpine

WORKDIR /app

# Installer dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copier le reste du projet
COPY . .

# Railway utilise une variable PORT dynamique
ENV PORT=3210

EXPOSE 3210

# Healthcheck (optionnel mais OK)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Démarrage (IMPORTANT : chemin corrigé)
CMD ["node", "server/server-firebase.js"]