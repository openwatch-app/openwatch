# OpenWatch (W.I.P)

![OpenWatch](./public/images/logo-full.png)

OpenWatch is a modern video streaming platform built with Next.js, designed for high-performance video playback and management.

## Features

### Core Experience

- **Home Feed**: Personalized feed with filters (All, Recently uploaded, Watched)
- **Video Player**: Adaptive streaming with multiple quality support
- **Search**: Full-text search for videos and channels
- **History**: Watch history tracking with pause functionality

### Interaction

- **Comments**: Nested replies, pinning, hearting, and like/dislike reactions
- **Reactions**: Like and Dislike videos
- **Subscriptions**: Subscribe to channels and customize notification settings
- **Notifications**: Real-time alerts for uploads, replies, and hearts with deep linking and management

### Creator Studio

- **Dashboard**: Overview of channel content and performance
- **Content Management**: Upload, edit, and manage videos
- **Customization**: Update channel banner, avatar, and description

### Admin Console

- **User Management**: Manage users and bans
- **System Settings**: Configure global application settings
- **Statistics**: Platform-wide metrics for users, videos, and engagement

## Tech Stack

- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL, Drizzle ORM
- **Video**: FFmpeg, HLS.js
- **State Management**: Zustand

## Development Setup

Follow these steps to set up the project locally for development:

#### Prerequisites

- Node.js (v20+ recommended)
- PostgreSQL database
- FFmpeg (installed locally)

#### Installation

1. **Clone the repository**:

    ```bash
    git clone https://github.com/openwatch-app/openwatch.git
    cd openwatch
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and configure your variables (Database URL, Auth secret, etc.).

#### Database Setup

```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push
```

#### Running Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8634`.

## Scripts

- `npm run dev` - Start development server on port 8634
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:studio` - Open Drizzle Studio to view database
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema to database

## Contributing

We welcome contributions! Please check our [Contributing Guidelines](CONTRIBUTING.md) for details on how to report bugs, request features, and submit pull requests.

## License

See [LICENSE](LICENSE) for full details.
