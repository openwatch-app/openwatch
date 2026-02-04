# OpenWatch (W.I.P)

OpenWatch is a modern video streaming platform built with Next.js, designed for high-performance video playback and management.

## Features

- 📹 **Video Streaming**: HLS streaming support with adaptive bitrate.
- 🔐 **Authentication**: Secure user authentication via Better Auth.
- 💾 **Database**: Robust data management using Drizzle ORM and PostgreSQL.
- 🎨 **UI/UX**: Modern interface built with Tailwind CSS v4 and Radix UI.
- 🛠️ **Video Processing**: Server-side video processing using FFmpeg.

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
    git clone <repository-url>
    cd opentube
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

## Contributing

We welcome contributions! Please check our [Contributing Guidelines](CONTRIBUTING.md) for details on how to report bugs, request features, and submit pull requests.

## License

See [LICENSE](LICENSE) for full details.
