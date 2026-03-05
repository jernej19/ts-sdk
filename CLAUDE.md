# CLAUDE.md

## Project Overview

PandaScore Odds SDK (`@pandascore/odds-sdk`) — a TypeScript SDK for PandaScore Sportsbook betting integration. Provides RabbitMQ feed integration, HTTP API clients, and real-time bet logging for esports betting.

## Build & Run

```bash
yarn compile        # TypeScript compilation (tsc && tsc-alias)
yarn build          # Compile + copy examples to dist/
yarn lint           # ESLint check
yarn lint:fix       # ESLint auto-fix
yarn format         # Prettier formatting
yarn start          # Run with ts-node (runs ts-prepare first)
```

No test framework is configured.

## Code Style

- **TypeScript strict mode** with ES2020 target, CommonJS output
- **2-space indentation**, single quotes, semicolons always, Unix line endings
- **Path aliases**: `@/*` maps to `src/*` (e.g., `import { Module } from '@/module'`)
- **Linting**: ESLint flat config with TypeScript ESLint + Prettier integration
- `@typescript-eslint/no-explicit-any` is disabled — `any` types are allowed

## Architecture

- **Singleton pattern**: SDKConfig, Matches, RMQFeed, RTBL all use `getInstance()` static methods
- **Static class methods**: Business logic exposed as static methods on classes
- **Centralized exports**: Public API re-exported through `src/index.ts`
- **One class per module file**, shared utilities in `src/utils/`
- **Logging**: Winston logger with lazy initialization per module (error, warn, info, debug levels)
- **Error handling**: Axios error checking with `axios.isAxiosError()`, try-catch with logging

## Key Directories

- `src/` — Main source (PandaSDK entry, config, interfaces, modules)
- `src/rabbitmq_connection/` — AMQPS RabbitMQ feed connection
- `src/rtbl/` — Real-time bet logging (publishing bets)
- `src/matches/` — Match data fetching and recovery
- `src/markets/` — Market types and limit calculations
- `src/utils/` — Logger, odds conversion, odds enrichment
- `examples/` — Usage examples
