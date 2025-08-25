FROM node:18-alpine

# Set work directory
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install --only=production

# Copy source
COPY . .

# Expose metrics port
EXPOSE 3000

# Run app
CMD ["node", "index.js"]
