FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
