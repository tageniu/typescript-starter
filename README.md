# Event Management API

NestJS take-home implementation for managing users, events, and merge-all overlap handling.

## Stack

- NestJS 11
- TypeORM
- SQLite for local persistence
- Jest + Supertest for unit and E2E coverage

## Requirements

- Node.js `>=20`
- npm `>=10`

## Install and run

```bash
npm install
npm run start:dev
```

The app listens on `http://localhost:3000`.

By default the application stores data in `event-mgmt.sqlite` at the repository root. Override the database path with `DB_PATH` if needed:

```bash
DB_PATH=./custom.sqlite npm run start:dev
```

## Test and quality checks

```bash
npm test
npm run test:e2e
npm run build
npm run lint
```

Unit tests use mocked repositories for service-level logic. E2E tests run against an in-memory SQLite database to validate the real HTTP and persistence flow.

## Implementation notes

- Persistence uses SQLite through TypeORM. Running the app locally uses a file-backed database; tests cover both mocked units and real database-backed HTTP flows, matching the FAQ guidance to do both.
- `User` and `Event` are modeled as a many-to-many relation through event invitees. User responses expose summarized related events for readability.
- Merge-all is destructive by design: overlapping source events are replaced in the database by a merged event, and invitees are unioned across the merged cluster.
- Additional review helpers beyond the minimum assignment API are included: `GET /`, `GET /users`, `GET /events`, and `DELETE /users/:id`.

## API

### Create a user

`POST /users`

```json
{
  "name": "Alice"
}
```

### Get all users

`GET /users`

### Get a user by id

`GET /users/:id`

### Delete a user

`DELETE /users/:id`

### Create an event

`POST /events`

```json
{
  "title": "Planning",
  "description": "Sprint planning session",
  "status": "TODO",
  "startTime": "2026-03-11T14:00:00.000Z",
  "endTime": "2026-03-11T15:00:00.000Z",
  "inviteeIds": [1, 2]
}
```

### Get all events

`GET /events`

### Get an event by id

`GET /events/:id`

### Delete an event

`DELETE /events/:id`

### Merge overlapping events for a user

`POST /users/:userId/merge-all`

This operation:

- inspects only the events that include the target user
- merges clusters where `next.startTime < current.endTime`
- keeps boundary-touching events separate when `next.startTime === current.endTime`
- unions all invitees from merged source events
- concatenates merged titles with ` / `
- concatenates non-empty descriptions with blank lines
- promotes merged status using `COMPLETED > IN_PROGRESS > TODO`
- deletes the original source events after persisting the merged replacement

## Demo checklist

For the requested demo video:

1. Create users and events.
2. Show `GET /`, `GET /users`, and `GET /events`.
3. Show `POST /events`, `GET /events/:id`, `DELETE /events/:id`, and `DELETE /users/:id`.
4. Show `POST /users/:userId/merge-all` and explain the overlap rule.
5. Run `npm test` to demonstrate unit coverage.
6. Run `npm run test:e2e` to demonstrate database-backed integration coverage.
