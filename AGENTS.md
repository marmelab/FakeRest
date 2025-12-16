# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FakeRest is a browser library that intercepts AJAX calls to mock a REST server based on JSON data. It provides adapters for MSW, fetch-mock, and Sinon.js to enable testing of JavaScript REST clients without a backend server.

## Common Commands

### Development
```bash
npm run dev              # Run dev server (uses MSW by default)
make run-msw            # Run with MSW adapter
make run-fetch-mock     # Run with fetch-mock adapter
make run-sinon          # Run with Sinon adapter
```

### Testing & Quality
```bash
npm test                # Run tests with Vitest
npm run format          # Format code with Biome
npm run lint            # Lint code with Biome
```

### Building
```bash
npm run build           # Build both minified and non-minified versions
make build              # Production build via Make
```

### Running Single Tests
```bash
npx vitest run [test-file-pattern]    # Run specific test file
npx vitest [test-name-pattern]        # Run tests matching pattern
```

## Architecture

### Core Components

The library has a layered architecture:

1. **Adapters Layer** (`src/adapters/`)
   - `MswAdapter`: Integrates with MSW (Mock Service Worker)
   - `FetchMockAdapter`: Integrates with fetch-mock
   - `SinonAdapter`: Integrates with Sinon.js fake server
   - Each adapter normalizes requests from their respective mocking library and transforms responses back

2. **Server Layer** (`SimpleRestServer`)
   - Implements REST semantics (GET, POST, PUT, PATCH, DELETE)
   - Handles routing to collections vs singles
   - Processes middleware chain
   - URL pattern: `/{collection}` or `/{collection}/{id}` or `/{single}`

3. **Database Layer** (`Database`)
   - Manages collections (arrays of records) and singles (single objects)
   - Routes CRUD operations to appropriate collection/single
   - Handles initialization from data objects

4. **Collection/Single Layer**
   - `Collection`: Implements filtering, sorting, pagination, and embedding for array data
   - `Single`: Manages single object resources (e.g., user profile, settings)
   - Both support embedding related resources

### Request Flow

```
Mocking Library (MSW/fetch-mock/Sinon)
  ↓
Adapter (normalizes request)
  ↓
SimpleRestServer.handle()
  ↓
Middleware chain (optional)
  ↓
SimpleRestServer.handleRequest()
  ↓
Database → Collection/Single
  ↓
Response (normalized)
  ↓
Adapter (transforms to library format)
  ↓
Mocking Library
```

### Key Concepts

- **Collections**: Array-based resources that support filtering (including `q` for full-text search, operators like `_gte`, `_lte`, `_eq`, `_neq`), sorting, range queries, and embedding
- **Singles**: Single object resources (not arrays) for endpoints like `/settings` or `/me`
- **Embedding**: Automatically resolve relationships by embedding related collections/singles in responses via `embed` parameter
- **Middleware**: Functions that intercept requests to add authentication, validation, delays, or dynamic values
- **Identifiers**: Customizable per collection (default: `id`, common alternative: `_id` for MongoDB-style APIs)

### File Structure

```
src/
├── adapters/           # Adapter implementations for different mocking libraries
├── Collection.ts       # Collection logic (filtering, sorting, pagination)
├── Database.ts         # Database managing collections and singles
├── SimpleRestServer.ts # REST server implementation with middleware support
├── Single.ts           # Single object resource logic
├── types.ts           # TypeScript type definitions
├── withDelay.ts       # Middleware helper for simulating delays
├── parseQueryString.ts # Query parameter parsing
└── index.ts           # Main entry point, exports public API
```

## Code Style

- **Formatter/Linter**: Biome (configured in `biome.json`)
  - 4-space indentation
  - Single quotes for strings
  - Explicit any types allowed (`noExplicitAny: off`)
- **TypeScript**: All source files use `.ts` extension with explicit `.ts` imports
- **Testing**: Vitest with happy-dom environment for DOM emulation
