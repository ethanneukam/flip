FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .
RUN npx tsc --noEmit || true

# Set environment variables (Railway will override these)
ENV NODE_ENV=production

# Command to run your infinite scraper
CMD ["npx", "ts-node", "scripts/scrapeRunner.ts"]
