#!/bin/sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    printf "${YELLOW}This script requires root privileges. Re-running with sudo...${NC}\n"
    exec sudo sh "$0" "$@"
fi

# Banner
printf "${BLUE}\n"
cat << 'EOF'
   ____               __          __   _       _     
  / __ \              \ \        / /  | |     | |    
 | |  | |_ __   ___ _ _\ \  /\  / /_ _| |_ ___| |__  
 | |  | | '_ \ / _ \ '_ \ \/  \/ / _` | __/ __| '_ \ 
 | |__| | |_) |  __/ | | \  /\  / (_| | || (__| | | |
  \____/| .__/ \___|_| |_|\/  \/ \__,_|\__\___|_| |_|
        | |                                          
        |_|                                                                                   
EOF
printf "${NC}\n"
printf "${BLUE}Welcome to the OpenWatch Installer!${NC}\n"
printf "\n"

# Function to generate secrets
generate_secret() {
    length=$1
    if command -v openssl > /dev/null 2>&1; then
        openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$length"
    else
        # Fallback to /dev/urandom
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c "$length"
    fi
}

# Check for Docker
if ! command -v docker > /dev/null 2>&1; then
    printf "${RED}Error: Docker is not installed.${NC}\n"
    printf "Please install Docker and Docker Compose before running this script.\n"
    printf "Visit https://docs.docker.com/get-docker/ for instructions.\n"
    exit 1
fi

# Set installation directory
DEFAULT_DIR="openwatch"
printf "Where would you like to install OpenWatch? (Default: ./${DEFAULT_DIR})\n> "
read USER_DIR
INSTALL_DIR=${USER_DIR:-$DEFAULT_DIR}

if [ -d "$INSTALL_DIR" ]; then
    printf "${YELLOW}Directory '$INSTALL_DIR' already exists.${NC}\n"
    printf "Do you want to continue? potentially overwriting files? (y/N) "
    read REPLY
    case "$REPLY" in
        [yY]*) ;;
        *)
            printf "Installation aborted.\n"
            exit 1
            ;;
    esac
fi

# Create directories
printf "${GREEN}Creating directories...${NC}\n"
mkdir -p "$INSTALL_DIR/data/.storage"

# Generate Secrets
printf "${GREEN}Generating secure credentials...${NC}\n"
DB_PASSWORD=$(generate_secret 24)
AUTH_SECRET=$(generate_secret 32)

# Create compose.yml
printf "${GREEN}Creating compose.yml...${NC}\n"

cat > "$INSTALL_DIR/compose.yml" <<EOL
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

printf "${GREEN}Installation setup complete!${NC}\n"
printf "\n"

# Prompt to start services
printf "${GREEN}Starting OpenWatch...${NC}\n"
    cd "$INSTALL_DIR" || exit 1
    
# Try docker compose first, fallback to docker-compose if needed
if command -v docker > /dev/null 2>&1 && docker compose version > /dev/null 2>&1; then
    DOCKER_CMD="docker compose"
elif command -v docker-compose > /dev/null 2>&1; then
    DOCKER_CMD="docker-compose"
else
    printf "${RED}Error: Could not find 'docker compose' or 'docker-compose'.${NC}\n"
    exit 1
fi

if $DOCKER_CMD up -d; then
    printf "\n"
    printf "${GREEN}OpenWatch is running!${NC}\n"
    printf "Access it at: ${BLUE}http://localhost:8634${NC}\n"
    printf "\n"
else
    printf "${RED}Failed to start OpenWatch.${NC}\n"
    printf "Please check the error messages above.\n"
fi