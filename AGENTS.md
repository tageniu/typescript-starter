# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

NestJS TypeScript starter application — a modular server-side framework project. Runs on Node.js >= 20, npm >= 10.

## Tech Stack

- **Framework**: NestJS 11 (with Express platform)
- **Language**: TypeScript 5.7+ (target ES2023, `nodenext` module resolution)
- **Testing**: Jest 29 with `ts-jest` (unit) + Supertest 7 (E2E)
- **Build**: NestJS CLI with SWC for fast compilation
- **Linting**: ESLint 9 (flat config) with `typescript-eslint` and Prettier integration
- **Formatting**: Prettier 3 — single quotes, trailing commas everywhere

## Project Structure

```
src/                    # Application source code
  main.ts               # Entry point — bootstraps NestFactory on port 3000
  app.module.ts          # Root module
  app.controller.ts      # HTTP controller (@Get)
  app.service.ts         # Business logic (@Injectable)
  app.controller.spec.ts # Unit test for controller
test/                   # E2E tests
  app.e2e-spec.ts        # E2E test suite (supertest)
  jest-e2e.json          # Jest config for E2E tests
dist/                   # Compiled output (git-ignored)
```

## Common Commands

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Build | `npm run build` |
| Start (dev, watch mode) | `npm run start:dev` |
| Start (production) | `npm run start:prod` |
| Run all unit tests | `npm test` |
| Run a single unit test | `npx jest --testPathPattern=<pattern>` |
| Run unit tests (watch) | `npm run test:watch` |
| Run E2E tests | `npm run test:e2e` |
| Run test coverage | `npm run test:cov` |
| Lint (with autofix) | `npm run lint` |
| Format code | `npm run format` |

## Architecture & Patterns

- **Controller-Service-Module pattern**: Controllers handle HTTP routing (`@Controller`, `@Get`, etc.), Services contain business logic (`@Injectable`) and are injected into controllers, Modules organize dependencies.
- **Dependency Injection**: Use `@Injectable()` decorators; register providers in module `providers` array.
- `src/main.ts` bootstraps the app via `NestFactory.create()` on port 3000.
- `AppModule` is the root module that registers all controllers and providers.

## Code Style & Conventions

- **Prettier**: Single quotes, trailing commas (`all`), auto line endings.
- **ESLint** (flat config): `typescript-eslint` recommended + type-checked rules; `no-explicit-any` is OFF; `no-floating-promises` and `no-unsafe-argument` are warnings.
- **File naming**: Kebab-case with `.controller.ts`, `.service.ts`, `.module.ts`, `.spec.ts` suffixes following NestJS conventions.
- **Test files**: Unit tests live alongside source files as `*.spec.ts`; E2E tests go in `test/`.

## Testing Guidelines

- Unit tests use `@nestjs/testing` `Test.createTestingModule()` to set up the DI container.
- E2E tests use `supertest` against the NestJS app instance with separate Jest config at `test/jest-e2e.json`.
- Jest config: `rootDir` is `src`, test regex matches `*.spec.ts`, transform uses `ts-jest`.

## Important Notes

- Do NOT change `module` or `moduleResolution` in tsconfig — NestJS requires `nodenext`.
- Decorators are enabled (`emitDecoratorMetadata`, `experimentalDecorators`) — required by NestJS.
- The project uses SWC (`@swc/core`, `@swc/cli`) for faster builds via `nest build`.
- Build output goes to `dist/` — run production with `node dist/main`.
