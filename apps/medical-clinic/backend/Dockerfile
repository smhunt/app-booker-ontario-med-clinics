FROM node:18-slim

# Install OpenSSL and build dependencies for native modules (bcrypt)
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (allow bcrypt to build)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 8080

# Start command
CMD ["npm", "run", "dev"]
