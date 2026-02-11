# Use the official Playwright image which has all browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Environment variables to help with memory and logging
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV TS_NODE_TRANSPILE_ONLY=true

# Run the scraper directly
CMD ["npm", "start"]
