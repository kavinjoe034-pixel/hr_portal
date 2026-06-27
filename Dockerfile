# ROVE Hire — production-ish container
# Note: Puppeteer needs Chromium system libraries and --no-sandbox in most container runtimes.

FROM node:20-slim

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything and build the client/server in one shot via the root build script
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000
ENV PUPPETEER_ARGS=--no-sandbox
EXPOSE 5000

CMD ["npm", "start"]
