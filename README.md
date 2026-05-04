# Backend Template

A TypeScript-based Node.js backend template with Express, PostgreSQL, and automated development workflow.

## Project Structure

```
backend-template/
├── src/                          # Source code directory
│   ├── app.ts                    # Express app configuration
│   ├── bin/
│   │   └── www.ts                # Server entry point
│   ├── config/                   # Configuration files
│   │   ├── db.ts                 # Database configuration
│   │   ├── index.ts              # Config index
│   │   ├── load-env.ts           # Environment variables loader
│   │   └── migrator.ts           # Database migrator configuration
│   ├── controllers/              # Request handlers
│   │   ├── index.ts              # Controllers index
│   │   └── v1/
│   │       ├── index.ts          # V1 controllers index
│   │       └── general/
│   │           ├── general.ts    # General controller logic
│   │           └── index.ts      # General controller index
│   ├── init/
│   │   └── init.ts               # Application initialization
│   ├── middleware/               # Express middleware
│   │   ├── dispatcher.ts         # Request dispatcher middleware
│   │   ├── globalErrorHandler.ts # Global error handler
│   │   ├── index.ts              # Middleware index
│   │   └── logger.ts             # Request logger middleware
│   ├── migrations/               # Database migrations
│   │   └── 1777832265532-create-user.ts
│   ├── routes/                   # API routes
│   │   ├── index.ts              # Routes index
│   │   └── v1/
│   │       ├── index.ts          # V1 routes index
│   │       └── general/
│   │           ├── general.ts    # General routes
│   │           └── index.ts      # General routes index
│   ├── scripts/                  # Utility scripts
│   │   ├── new-migration.ts      # Create new migration script
│   │   └── run-migration.ts      # Run migrations script
│   ├── services/                 # Business logic layer
│   │   ├── index.ts              # Services index
│   │   └── general/
│   │       ├── general.ts        # General service logic
│   │       └── index.ts          # General service index
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Types index
│   │   └── types.ts              # Type definitions
│   └── utils/                    # Utility functions
│       ├── errorHandler.ts       # Error handling utilities
│       ├── helper.ts             # Helper functions
│       ├── index.ts              # Utils index
│       └── status-codes.ts       # HTTP status codes
├── docker/                       # Docker configuration
│   ├── Dockerfile                # Docker image definition
│   └── Docker-compose.yml        # Docker Compose configuration
├── dist/                         # Compiled JavaScript output (generated)
├── node_modules/                 # Dependencies (generated)
├── eslint.config.mts             # ESLint configuration
├── nodemon.json                  # Nodemon auto-restart configuration
├── package.json                  # Project metadata and dependencies
├── pnpm-lock.yaml                # Locked dependency versions
├── sonar-project.properties      # SonarQube configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Code Formatting**: Prettier
- **Development**: Nodemon, ts-node

## Installation

1. Install dependencies:

    ```bash
    pnpm install
    ```

2. Create a `.env` file with your environment variables:
    ```bash
    cp .env.example .env
    ```

## Available Scripts

### Development

```bash
pnpm start:dev
```

Starts the server with auto-restart on file changes using Nodemon.

### Production

```bash
pnpm build
pnpm start
```

Builds TypeScript to JavaScript and runs the compiled server.

### Database Migrations

```bash
pnpm migrate:create    # Create a new migration
pnpm migrate:up        # Run pending migrations
pnpm migrate:down      # Rollback last migration
pnpm migrate:status    # Check migration status
pnpm migrate:reset     # Reset all migrations
```

### Code Quality

```bash
pnpm lint              # Run ESLint
pnpm lint:fix          # Fix ESLint issues
```

## Architecture

The project follows a layered architecture:

- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define API endpoints
- **Services**: Contain business logic
- **Models**: Database schema and queries
- **Middleware**: Process requests before they reach controllers
- **Utils**: Shared utility functions

## Configuration Files

- **tsconfig.json**: TypeScript compilation settings
- **eslint.config.mts**: ESLint rules and code style standards
- **nodemon.json**: Auto-restart configuration for development
- **sonar-project.properties**: SonarQube analysis configuration
- **docker-compose.yml**: Local development environment with Docker

## Development Workflow

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables: Create `.env` file
4. Start development server: `pnpm start:dev`
5. Server will auto-restart when you save files
6. Make API calls to `http://localhost:3000` (or configured port)

## License

ISC
