FROM node:18-alpine

# Install build dependencies for native modules (bcrypt) and OpenSSL for Prisma
RUN apk add --no-cache python3 make g++ openssl1.1-compat

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
