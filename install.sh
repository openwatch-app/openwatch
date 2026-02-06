#!/bin/bash

# OpenWatch Installer
# This script sets up OpenWatch with Docker Compose, generating secure credentials and necessary directories.

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "   ____                   _       __      _       _     "
echo "  / __ \                 | |     / /     | |     | |    "
echo " | |  | |_ __   ___ _ __ | |    / /_ _ __| |_ ___| |__  "
echo " | |  | | '_ \ / _ \ '_ \| |   / / _\` | __| __/ __| '_ \ "
echo " | |__| | |_) |  __/ | | | |  / / (_| | | | || (__| | | |"
echo "  \____/| .__/ \___|_| |_|_| /_/ \__,_|_|  \__\___|_| |_|"
echo "        | |                                              "
echo "        |_|                                              "
echo -e "${NC}"
echo -e "${BLUE}Welcome to the OpenWatch Installer!${NC}"
echo ""

# Function to generate secrets
generate_secret() {
    local length=$1
    if command -v openssl &> /dev/null; then
        openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$length"
    else
        # Fallback to /dev/urandom
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c "$length"
    fi
}

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker and Docker Compose before running this script."
    echo "Visit https://docs.docker.com/get-docker/ for instructions."
    exit 1
fi

# Set installation directory
DEFAULT_DIR="openwatch"
echo -e "Where would you like to install OpenWatch? (Default: ./${DEFAULT_DIR})"
read -p "> " USER_DIR
INSTALL_DIR=${USER_DIR:-$DEFAULT_DIR}

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory '$INSTALL_DIR' already exists.${NC}"
    read -p "Do you want to continue? potentially overwriting files? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation aborted."
        exit 1
    fi
fi

# Create directories
echo -e "${GREEN}Creating directories...${NC}"
mkdir -p "$INSTALL_DIR/data/.storage"

# Generate Secrets
echo -e "${GREEN}Generating secure credentials...${NC}"
DB_PASSWORD=$(generate_secret 24)
AUTH_SECRET=$(generate_secret 32)

# Create docker-compose.yml
echo -e "${GREEN}Creating docker-compose.yml...${NC}"

cat > "$INSTALL_DIR/docker-compose.yml" <<EOL
services:
    app:
        image: ghcr.io/openwatch-app/openwatch:latest
        container_name: openwatch
        restart: unless-stopped
        ports:
            - 8634:8634
        environment:
            - DATABASE_URL=postgres://postgres:${DB_PASSWORD}@db:5432/openwatch
            - NEXT_PUBLIC_BASE_URL=http://localhost:8634
            - AUTH_SECRET=${AUTH_SECRET}
        volumes:
            - ./data/.storage:/app/.storage
        depends_on:
            - db

    db:
        image: postgres:17-alpine
        container_name: openwatch-db
        restart: unless-stopped
        ports:
            - 5432:5432
        environment:
            - POSTGRES_USER=postgres
            - POSTGRES_PASSWORD=${DB_PASSWORD}
            - POSTGRES_DB=openwatch
        volumes:
            - postgres_data:/var/lib/postgresql/data

volumes:
    postgres_data:
EOL

# Create a README for the user
cat > "$INSTALL_DIR/README.txt" <<EOL
OpenWatch Installation
======================

Credentials:
------------
Database Password: ${DB_PASSWORD}
Auth Secret:       ${AUTH_SECRET}

Commands:
---------
Start:   docker compose up -d
Stop:    docker compose down
Logs:    docker compose logs -f

Access:
-------
App:     http://localhost:8634
EOL

echo -e "${GREEN}Installation setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Navigate to the directory: ${YELLOW}cd $INSTALL_DIR${NC}"
echo -e "2. Start the services:        ${YELLOW}docker compose up -d${NC}"
echo ""
echo -e "Credentials have been saved to ${YELLOW}$INSTALL_DIR/README.txt${NC}"
